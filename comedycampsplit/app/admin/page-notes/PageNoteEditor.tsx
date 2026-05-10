"use client";

import { useState, useTransition } from "react";
import { setPageNote } from "@/app/actions/pageNote";

export function PageNoteEditor({
  pageKey,
  label,
  initial,
}: {
  pageKey: string;
  label: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  function save() {
    setError("");
    setStatus("idle");
    startTransition(async () => {
      const r = await setPageNote(pageKey, value);
      if (r && "error" in r && r.error) {
        setStatus("error");
        setError(r.error);
        return;
      }
      setStatus("saved");
    });
  }

  const dirty = value !== initial;

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-medium text-stone-900">{label}</h3>
        <code className="text-xs text-stone-500">/dashboard/{pageKey === "dashboard" ? "" : pageKey}</code>
      </div>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setStatus("idle");
        }}
        rows={2}
        placeholder="Write a note that members will see at the top of this page…"
        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 resize-y"
      />
      <div className="flex items-center justify-between gap-3 mt-2">
        <p className="text-xs text-stone-500">
          {status === "saved" && !dirty && "Saved."}
          {status === "error" && <span className="text-red-700">{error}</span>}
        </p>
        <button
          onClick={save}
          disabled={!dirty || pending}
          className="text-xs px-3 py-1.5 bg-stone-900 text-white rounded-md font-medium hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? "Saving…" : value.trim() ? "Save" : "Clear"}
        </button>
      </div>
    </div>
  );
}
