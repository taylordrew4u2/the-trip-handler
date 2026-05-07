"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { addLodgingPhoto, deleteLodgingPhoto, updateLodgingPhotoCaption } from "@/app/actions/itinerary";
import type { LodgingPhoto } from "@prisma/client";

export function LodgingPhotosClient({ tripId, photos }: { tripId: string; photos: LodgingPhoto[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("tripId", tripId);
        const res = await fetch("/api/upload-lodging-photo", { method: "POST", body: fd });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          setError(data.error ?? `Upload failed for ${file.name}`);
          continue;
        }
        const result = await addLodgingPhoto(tripId, data.url);
        if (result?.error) setError(result.error);
      }
      router.refresh();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this photo?")) return;
    await deleteLodgingPhoto(id);
    router.refresh();
  }

  async function handleCaption(id: string, current: string | null) {
    const next = window.prompt("Caption (or leave blank):", current ?? "");
    if (next === null) return;
    await updateLodgingPhotoCaption(id, next);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-medium text-stone-900">Lodging photos</h2>
          <p className="text-sm text-stone-500 mt-1">Show participants where they&apos;ll be staying.</p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "+ Upload photos"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {photos.length === 0 ? (
        <p className="text-stone-500 text-sm">No photos yet — upload one or more.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption ?? "Lodging photo"} className="w-full aspect-square object-cover" />
              <div className="p-2 space-y-1.5">
                <p className="text-xs text-stone-700 break-words min-h-[2em]">{p.caption ?? <span className="text-stone-400 italic">No caption</span>}</p>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => handleCaption(p.id, p.caption)}
                    className="px-2 py-1 border border-stone-300 text-stone-700 rounded hover:bg-stone-100"
                  >
                    Caption
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="px-2 py-1 border border-red-300 text-red-700 rounded hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
