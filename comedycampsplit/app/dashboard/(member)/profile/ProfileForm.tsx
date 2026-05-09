"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/profile";
import { SLEEP_TAGS } from "@/lib/sleep";

const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900";

export function ProfileForm({
  userId,
  email,
  defaults,
}: {
  userId: string;
  email: string;
  defaults: {
    name: string;
    username: string;
    phone: string;
    bio: string;
    gender: string;
    sleepTags: string[];
    sleepNote: string;
  };
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [sleepTags, setSleepTags] = useState<string[]>(defaults.sleepTags);

  function toggleTag(value: string) {
    setSleepTags((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string)?.trim();
    const username = ((fd.get("username") as string) ?? "").trim();
    const phone = ((fd.get("phone") as string) ?? "").trim();
    const bio = ((fd.get("bio") as string) ?? "").trim();
    const gender = ((fd.get("gender") as string) ?? "").trim();
    const sleepNote = ((fd.get("sleepNote") as string) ?? "").trim();

    if (!name) {
      setError("Name is required.");
      setSubmitting(false);
      return;
    }
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores.");
      setSubmitting(false);
      return;
    }

    const result = await updateProfile(userId, {
      name,
      username: username || undefined,
      phone: phone || undefined,
      bio: bio || undefined,
      gender: gender || undefined,
      sleepTags,
      sleepNote: sleepNote || undefined,
    });
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSavedAt(new Date().toLocaleTimeString());
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}
      {savedAt && !error && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 text-sm">
          Saved at {savedAt}.
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">NAME *</label>
        <input name="name" required defaultValue={defaults.name} className={inputCls} />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">USERNAME</label>
        <input name="username" defaultValue={defaults.username} className={inputCls} placeholder="Letters, numbers, underscores" />
        <p className="text-xs text-stone-500 mt-1">Shown on the roster as @username when set.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">EMAIL</label>
        <input value={email} disabled className={`${inputCls} bg-stone-100 text-stone-500 cursor-not-allowed`} />
        <p className="text-xs text-stone-500 mt-1">Email is your sign-in. Contact admin if you need it changed.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">PHONE</label>
        <input name="phone" type="tel" defaultValue={defaults.phone} className={inputCls} placeholder="Optional" />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">GENDER</label>
        <select name="gender" defaultValue={defaults.gender} className={inputCls}>
          <option value="">Prefer not to say</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="non-binary">Non-binary</option>
          <option value="other">Other</option>
        </select>
        <p className="text-xs text-stone-500 mt-1">
          Female members can request a single bed even if it&apos;s already taken (current occupant
          gets bumped and emailed). Used only for that.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">COMEDY BIO</label>
        <textarea
          name="bio"
          rows={4}
          defaultValue={defaults.bio}
          className={`${inputCls} resize-none`}
          placeholder="Style, one-liner, anything you want on the roster."
        />
      </div>

      <div className="border-t border-stone-200 pt-5">
        <p className="text-xs font-medium text-stone-700 mb-1.5 tracking-wide">SLEEP STYLE</p>
        <p className="text-xs text-stone-500 mb-3">
          Helps people pick a compatible bedmate. Shown next to your name on the sleeping page.
        </p>
        <div className="flex flex-wrap gap-2">
          {SLEEP_TAGS.map((t) => {
            const on = sleepTags.includes(t.value);
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleTag(t.value)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  on
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                <span className="mr-1">{t.emoji}</span>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">SLEEP NOTE</label>
        <textarea
          name="sleepNote"
          rows={2}
          defaultValue={defaults.sleepNote}
          className={`${inputCls} resize-none`}
          placeholder="Anything else helpful — wake-up time, meds, allergies to feathers, etc."
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
