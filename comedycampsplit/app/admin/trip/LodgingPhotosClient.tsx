"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { addLodgingPhoto, deleteLodgingPhoto, updateLodgingPhotoCaption } from "@/app/actions/itinerary";
import type { LodgingPhoto } from "@prisma/client";

export function LodgingPhotosClient({ tripId, photos }: { tripId: string; photos: LodgingPhoto[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setError("");
    setUploading(true);
    try {
      let i = 0;
      for (const file of list) {
        i += 1;
        setProgress(`Uploading ${i}/${list.length}: ${file.name}`);
        try {
          if (file.size > 10 * 1024 * 1024) {
            setError(`${file.name} is over 10MB. Skipping.`);
            continue;
          }
          if (file.type && !file.type.startsWith("image/")) {
            setError(`${file.name} isn't an image. Skipping.`);
            continue;
          }
          const ext = file.name.split(".").pop() ?? "jpg";
          const pathname = `lodging/${tripId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const blob = await upload(pathname, file, {
            access: "public",
            handleUploadUrl: "/api/upload-lodging-photo",
          });
          const result = await addLodgingPhoto(tripId, blob.url);
          if (result?.error) setError(result.error);
        } catch (err) {
          setError(`${file.name}: ${(err as Error).message}`);
        }
      }
      router.refresh();
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) await uploadFiles(files);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragOver) setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      setError("Only image files can be uploaded.");
      return;
    }
    await uploadFiles(files);
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-serif text-xl font-medium text-stone-900">Lodging photos</h2>
          <p className="text-sm text-stone-500 mt-1">
            Show participants where they&apos;ll be staying. Up to 10MB per photo.
          </p>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`rounded-xl border-2 border-dashed px-4 py-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-stone-900 bg-stone-50"
            : "border-stone-300 hover:border-stone-500 hover:bg-stone-50"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
        }}
      >
        <p className="font-medium text-stone-900">
          {uploading ? "Uploading…" : dragOver ? "Drop to upload" : "Drag photos here or click to choose"}
        </p>
        <p className="text-xs text-stone-500 mt-1">JPG / PNG / WebP / GIF · 10MB each · multiple at once</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="hidden"
        />
      </div>

      {progress && (
        <div className="bg-stone-50 border border-stone-200 text-stone-700 rounded-lg px-3 py-2 text-sm">
          {progress}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {photos.length === 0 ? (
        <p className="text-stone-500 text-sm">No photos yet — drag some in above.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption ?? "Lodging photo"} className="w-full aspect-square object-cover" />
              <div className="p-2 space-y-1.5">
                <p className="text-xs text-stone-700 break-words min-h-[2em]">
                  {p.caption ?? <span className="text-stone-400 italic">No caption</span>}
                </p>
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
