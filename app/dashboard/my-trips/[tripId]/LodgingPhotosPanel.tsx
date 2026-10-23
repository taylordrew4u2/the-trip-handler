"use client";

import { useRef, useState, useTransition } from "react";
import { addTripLodgingPhoto, deleteTripLodgingPhoto } from "@/app/actions/trips";
import { compressImage } from "@/components/compressImage";

type Photo = { id: string; url: string; caption: string | null };

export function LodgingPhotosPanel({ tripId, photos }: { tripId: string; photos: Photo[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function upload(e: React.FormEvent) {
    e.preventDefault();
    const files = Array.from(fileRef.current?.files ?? []);
    if (files.length === 0) return;
    setError("");
    startTransition(async () => {
      for (const file of files) {
        const form = new FormData();
        form.set("photo", await compressImage(file));
        if (files.length === 1) form.set("caption", caption);
        try {
          const result = await addTripLodgingPhoto(tripId, form);
          if ("error" in result && result.error) {
            setError(result.error);
            return;
          }
        } catch {
          setError("Upload failed — check your connection and try again.");
          return;
        }
      }
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-6 space-y-4">
      <div>
        <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-950">Lodging photos</h2>
        <p className="text-slate-600 text-sm leading-6 mt-2">
          Shown to guests on the Lodging page. Photos are shrunk automatically and stored in the app — free.
        </p>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={upload} className="grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 sm:grid-cols-[1fr_1fr_auto]">
        <input
          ref={fileRef}
          aria-label="Photos"
          type="file"
          accept="image/*"
          multiple
          className="min-w-0 text-sm text-slate-700"
        />
        <input
          aria-label="Caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption (optional, one photo)"
          maxLength={200}
          className="min-w-0 px-3 min-h-[44px] rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
        />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center px-4 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {isPending ? "Uploading…" : "Add photos"}
        </button>
      </form>

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption ?? "Lodging photo"} className="aspect-square w-full object-cover" />
              <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                <span className="truncate text-xs text-slate-600">{p.caption ?? ""}</span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (confirm("Remove this photo?")) {
                      startTransition(async () => {
                        const result = await deleteTripLodgingPhoto(p.id);
                        if ("error" in result && result.error) setError(result.error);
                      });
                    }
                  }}
                  className="min-h-[44px] shrink-0 px-2 text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
