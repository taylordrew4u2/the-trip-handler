"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { generateMyTripJoinCode, setMyTripApplicationOpen } from "@/app/actions/trips";

const button =
  "inline-flex items-center justify-center min-h-[44px] rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-50";

const noSubscribe = () => () => {};

/** Everything an organizer needs to get people onto the trip, at the top of the trip page. */
export function InvitePanel({
  origin,
  tripId,
  tripName,
  inviteToken,
  joinCode,
  isApplicationOpen,
  waiting,
}: {
  /** The site's address, e.g. https://the-trip-handler.vercel.app */
  origin: string;
  tripId: string;
  tripName: string;
  inviteToken: string;
  joinCode: string | null;
  isApplicationOpen: boolean;
  /** Applicants who submitted their form and are waiting on approval. */
  waiting: number;
}) {
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  // The phone's share sheet exists only in the browser, and not in every browser.
  const canShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === "function", () => false);

  const link = `${origin}/join/${inviteToken}`;
  const message = `Join me on "${tripName}"! Sign up and fill out the quick form here: ${link}${joinCode ? ` (trip code: ${joinCode})` : ""}`;

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setError("Couldn't copy — press and hold the link to copy it.");
    }
  }

  function run(action: () => Promise<{ error?: string } | { success: boolean }>) {
    setError("");
    startTransition(async () => {
      try {
        const result = await action();
        if ("error" in result && result.error) setError(result.error);
      } catch {
        setError("That didn't save — check your connection and try again.");
      }
    });
  }

  return (
    <section aria-labelledby="invite-heading" className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5 shadow-sm sm:p-6 space-y-4">
      <div>
        <h2 id="invite-heading" className="font-serif text-2xl font-medium tracking-tight text-slate-950">Add people to this trip</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-700">
          <li>Send your friends the invite link below (text it, or share it anywhere).</li>
          <li>They open it, make an account, and fill out your guest form.</li>
          <li>You approve them on <Link href="/dashboard/my-trips" className="font-semibold text-teal-800 underline underline-offset-2">My trips</Link> — then they&apos;re in.</li>
        </ol>
      </div>

      {!isApplicationOpen && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>Applications are closed, so the link won&apos;t let anyone join.</span>
          <button type="button" disabled={isPending} onClick={() => run(() => setMyTripApplicationOpen(tripId, true))} className={`${button} bg-amber-600 text-white hover:bg-amber-700`}>
            Open applications
          </button>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-800">Invite link</p>
        <code className="block min-h-[44px] break-all rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs leading-5 text-slate-700">
          {link}
        </code>
        <div className="flex flex-wrap gap-2">
          {canShare && (
            <button
              type="button"
              onClick={() => navigator.share({ title: tripName, text: message }).catch(() => {})}
              className={`${button} bg-teal-700 text-white hover:bg-teal-800`}
            >
              Share invite
            </button>
          )}
          <a href={`sms:?&body=${encodeURIComponent(message)}`} className={`${button} ${canShare ? "border border-teal-200 bg-white text-teal-800 hover:bg-teal-50" : "bg-teal-700 text-white hover:bg-teal-800"}`}>
            Text it
          </a>
          <button type="button" onClick={() => copy(link, "link")} aria-live="polite" className={`${button} border border-teal-200 bg-white text-teal-800 hover:bg-teal-50`}>
            {copied === "link" ? "Copied" : "Copy link"}
          </button>
          <button type="button" onClick={() => copy(message, "message")} aria-live="polite" className={`${button} border border-teal-200 bg-white text-teal-800 hover:bg-teal-50`}>
            {copied === "message" ? "Copied" : "Copy invite message"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-800">Trip code <span className="font-normal text-slate-600">— friends can type this on the home screen instead of using the link</span></p>
        {joinCode ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="inline-flex min-h-[44px] items-center rounded-xl border border-teal-100 bg-white px-3 font-mono text-base tracking-widest text-teal-800">{joinCode}</code>
            <button type="button" onClick={() => copy(joinCode, "code")} aria-live="polite" className={`${button} border border-teal-200 bg-white text-teal-800 hover:bg-teal-50`}>
              {copied === "code" ? "Copied" : "Copy code"}
            </button>
          </div>
        ) : (
          <button type="button" disabled={isPending} onClick={() => run(() => generateMyTripJoinCode(tripId))} className={`${button} border border-teal-200 bg-white text-teal-800 hover:bg-teal-50`}>
            Create a trip code
          </button>
        )}
      </div>

      {waiting > 0 && (
        <Link href="/dashboard/my-trips" className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-teal-800 ring-1 ring-teal-200 hover:bg-teal-50">
          <span>{waiting} {waiting === 1 ? "person is" : "people are"} waiting for you to approve them</span>
          <span aria-hidden>→</span>
        </Link>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
