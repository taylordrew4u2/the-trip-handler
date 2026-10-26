"use client";

import { useState, useTransition } from "react";
import {
  addTripLodgingPhoto,
  deleteTripLodgingPhoto,
  moveTripLodgingPhoto,
  updateTripLodgingPhotoCaption,
} from "@/app/actions/trips";
import { compressImage } from "@/components/compressImage";

type Photo = { id: string; url: string; caption: string | null };

const MAX_PHOTOS = 30;
const PARALLEL_UPLOADS = 3;

export function LodgingPhotosPanel({ tripId, photos }: { tripId: string; photos: Photo[] }) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const uploading = progress !== null;
  const room = MAX_PHOTOS - photos.length;

  async function upload(picked: File[]) {
    const images = picked.filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (images.length === 0) {
      setError("Pick photos (JPG, PNG, WebP, GIF or HEIC).");
      return;
    }
    const files = images.slice(0, Math.max(0, room));
    const skipped = images.length - files.length;
    setError("");
    setNotice("");
    if (files.length === 0) {
      setError(`That's the limit of ${MAX_PHOTOS} photos. Remove one first.`);
      return;
    }

    let done = 0;
    const failed: string[] = [];
    setProgress({ done, total: files.length });
    // A few at a time: faster than one by one, without flooding a phone connection.
    const queue = [...files];
    await Promise.all(
      Array.from({ length: Math.min(PARALLEL_UPLOADS, files.length) }, async () => {
        for (let file = queue.shift(); file; file = queue.shift()) {
          try {
            const form = new FormData();
            form.set("photo", await compressImage(file));
            const result = await addTripLodgingPhoto(tripId, form);
            if ("error" in result && result.error) failed.push(`${file.name}: ${result.error}`);
          } catch {
            failed.push(`${file.name}: upload failed — check your connection`);
          }
          done += 1;
          setProgress({ done, total: files.length });
        }
      }),
    );
    setProgress(null);

    const added = files.length - failed.length;
    if (added > 0) setNotice(`Added ${added} photo${added === 1 ? "" : "s"}.`);
    const problems = [...failed];
    if (skipped > 0) problems.push(`${skipped} photo${skipped === 1 ? " was" : "s were"} skipped — the limit is ${MAX_PHOTOS}.`);
    if (problems.length) setError(problems.join("\n"));
  }

  function run(action: () => Promise<{ error?: string } | { success: boolean }>) {
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const result = await action();
        if ("error" in result && result.error) setError(result.error);
      } catch {
        setError("That didn't save — check your connection and try again.");
      }
    });
  }

  const busy = uploading || isPending;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-6 space-y-4">
      <div>
        <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-950">Lodging photos</h2>
        <p className="text-slate-600 text-sm leading-6 mt-2">
          Shown to guests on the Lodging page, in this order. Pick as many as you like at once — they upload right away
          and are shrunk automatically. {photos.length} of {MAX_PHOTOS} used.
        </p>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) void upload(Array.from(e.dataTransfer.files));
        }}
        className={`relative flex min-h-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal-700 ${
          dragging ? "border-teal-600 bg-teal-50" : "border-slate-300 bg-slate-50/60 hover:bg-slate-50"
        } ${busy || room <= 0 ? "pointer-events-none opacity-60" : ""}`}
      >
        <span className="text-base font-semibold text-teal-800">
          {progress
            ? `Uploading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
            : room <= 0
              ? "Photo limit reached"
              : "Tap to choose photos"}
        </span>
        <span className="text-sm text-slate-600">
          {uploading ? "Keep this page open until it finishes." : "or drag them here · you can pick several at once"}
        </span>
        {progress && (
          <span className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200" aria-hidden>
            <span
              className="block h-full bg-teal-700 transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={busy || room <= 0}
          aria-label="Choose lodging photos"
          // Invisible but covering the whole drop zone, so any tap on it opens the picker.
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            e.target.value = "";
            void upload(picked);
          }}
        />
      </label>

      {notice && (
        <p role="status" className="text-sm text-green-800">
          {notice}
        </p>
      )}
      {error && (
        <div role="alert" className="whitespace-pre-line bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {photos.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption ?? `Lodging photo ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-2 p-2">
                <input
                  key={p.caption ?? ""}
                  aria-label={`Caption for photo ${i + 1}`}
                  defaultValue={p.caption ?? ""}
                  placeholder="Add a caption (optional)"
                  maxLength={200}
                  disabled={busy}
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (next !== (p.caption ?? "")) run(() => updateTripLodgingPhotoCaption(p.id, next));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  className="block min-h-[44px] w-full min-w-0 rounded-lg border border-slate-300 px-2 text-sm text-slate-900 placeholder:text-slate-500"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={busy || i === 0}
                    aria-label={`Move photo ${i + 1} earlier`}
                    onClick={() => run(() => moveTripLodgingPhoto(p.id, "earlier"))}
                    className="min-h-[44px] min-w-[44px] rounded-lg border border-slate-300 text-sm text-slate-700 disabled:opacity-40"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    disabled={busy || i === photos.length - 1}
                    aria-label={`Move photo ${i + 1} later`}
                    onClick={() => run(() => moveTripLodgingPhoto(p.id, "later"))}
                    className="min-h-[44px] min-w-[44px] rounded-lg border border-slate-300 text-sm text-slate-700 disabled:opacity-40"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (confirm("Remove this photo?")) run(() => deleteTripLodgingPhoto(p.id));
                    }}
                    className="ml-auto min-h-[44px] shrink-0 px-2 text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
