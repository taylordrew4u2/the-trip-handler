"use client";

import { useState, useRef } from "react";
import { updateAvatar } from "@/app/actions/profile";

interface AvatarUploadProps {
  userId: string;
  currentUrl: string | null;
  name: string;
}

export function AvatarUpload({ userId, currentUrl, name }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload-avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        await updateAvatar(userId, data.url);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={() => fileRef.current?.click()}
        className="relative group"
        type="button"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={name}
            className="w-24 h-24 rounded-full object-cover border border-stone-300"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-stone-900 flex items-center justify-center text-stone-100 font-medium text-2xl border border-stone-300">
            {initials}
          </div>
        )}
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-white text-xs">{uploading ? "Uploading…" : "Change"}</span>
        </div>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <p className="text-xs text-stone-500">Click to change photo</p>
    </div>
  );
}
