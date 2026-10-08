"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  setPhase,
  createSuggestion,
  deleteSuggestion,
  castVote,
  confirmMeal,
  setSlotStatus,
  addGroceryItem,
  toggleBought,
  deleteGroceryItem,
} from "@/app/actions/meals";
import type { Phase } from "@/lib/meals";

interface Suggestion {
  id: string;
  mealName: string;
  note: string | null;
  helpOffered: string[];
  dietaryTags: string[];
  createdAt: Date;
  submittedByUserId: string;
  submittedBy: { id: string; name: string; username: string | null };
}

interface VoteRow {
  id: string;
  userId: string;
  suggestionId: string | null;
  isDontCare: boolean;
}

interface HelperRow {
  id: string;
  helpType: string;
  user: { id: string; name: string; username: string | null };
}

interface GroceryItemRow {
  id: string;
  name: string;
  category: string;
  quantity: string | null;
  bought: boolean;
  notes: string | null;
}

interface SlotRow {
  id: string;
  dayName: string;
  mealType: string;
  orderIndex: number;
  isOptional: boolean;
  status: string;
  confirmedSuggestionId: string | null;
  adminOverrideNote: string | null;
  suggestions: Suggestion[];
  votes: VoteRow[];
  helpers: HelperRow[];
  groceries: GroceryItemRow[];
}

interface CompletionSummary {
  requiredCount: number;
  totalUsers: number;
  usersComplete: number;
  usersIncomplete: number;
  incompleteUsers: { id: string; name: string }[];
}

const HELP_OPTIONS = [
  { value: "cook", label: "Cook" },
  { value: "prep", label: "Prep" },
  { value: "shop", label: "Shop" },
  { value: "clean", label: "Clean" },
  { value: "just_suggesting", label: "Just suggesting" },
];

const DIETARY_OPTIONS = [
  "Vegetarian possible",
  "Vegan possible",
  "Gluten-free possible",
  "Dairy-free possible",
  "Contains nuts",
  "Not sure",
];

const GROCERY_CATEGORIES = [
  "Produce",
  "Protein",
  "Dairy",
  "Carbs",
  "Snacks",
  "Drinks",
  "Condiments",
  "Other",
];

const PHASE_LABEL: Record<Phase, string> = {
  suggestions_open: "Suggestions open",
  voting_open: "Voting open",
  admin_finalizing: "Admin finalizing",
  finalized: "Finalized",
};

const PHASE_COPY: Record<Phase, string> = {
  suggestions_open:
    "Each meal below is its own poll. Vote for an idea you like, choose \"I don't care,\" or write in your own idea — anytime.",
  voting_open:
    "Each meal below is its own poll. Vote for an idea you like, choose \"I don't care,\" or write in your own idea — anytime.",
  admin_finalizing:
    "Voting is closed. The admin is reviewing the top choices and finalizing the meal plan.",
  finalized:
    "Meals are finalized. Check the grocery list, cooking assignments, and dietary notes.",
};

export function MealsPlanner({
  currentUserId,
  isAdmin,
  tripId,
  slots,
  phase,
  completion,
}: {
  currentUserId: string;
  isAdmin: boolean;
  tripId: string;
  slots: SlotRow[];
  phase: Phase;
  completion: CompletionSummary | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [showSuggestModal, setShowSuggestModal] = useState(false);

  const days = useMemo(() => {
    const map = new Map<string, SlotRow[]>();
    for (const s of slots) {
      if (!map.has(s.dayName)) map.set(s.dayName, []);
      map.get(s.dayName)!.push(s);
    }
    return Array.from(map.entries());
  }, [slots]);

  const requiredSlots = slots.filter((s) => !s.isOptional);
  const myVotes = new Map<string, VoteRow>();
  for (const s of slots) {
    const v = s.votes.find((vv) => vv.userId === currentUserId);
    if (v) myVotes.set(s.id, v);
  }
  const myCompletedRequired = requiredSlots.filter((s) => myVotes.has(s.id));
  const myMissingRequired = requiredSlots.filter((s) => !myVotes.has(s.id));

  async function run<T>(label: string, fn: () => Promise<T>) {
    setError("");
    setBusy(label);
    try {
      const r = (await fn()) as { error?: string } | undefined;
      if (r && "error" in r && r.error) setError(r.error);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-w-0 space-y-8 max-w-4xl">
      <header>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">Meals</h1>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
              phase === "suggestions_open"
                ? "bg-blue-100 text-blue-900"
                : phase === "voting_open"
                ? "bg-amber-100 text-amber-900"
                : phase === "admin_finalizing"
                ? "bg-slate-200 text-slate-900"
                : "bg-emerald-100 text-emerald-900"
            }`}
          >
            {PHASE_LABEL[phase]}
          </span>
          <p className="text-slate-600 text-sm">{PHASE_COPY[phase]}</p>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {isAdmin && (
        <AdminPhaseControls tripId={tripId} phase={phase} completion={completion} run={run} />
      )}

      {!isAdmin && phase === "suggestions_open" && (
        <button
          onClick={() => setShowSuggestModal(true)}
          className="min-w-[44px] inline-flex items-center justify-center px-4 min-h-[44px] bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800"
        >
          + Suggest a meal
        </button>
      )}

      {!isAdmin && phase === "voting_open" && (
        <div className="min-w-0 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-900">
            Voting progress: <span className="tabular-nums">{myCompletedRequired.length}</span>{" "}
            <span className="text-slate-600">of {requiredSlots.length} required votes done</span>
          </p>
          {myMissingRequired.length > 0 && (
            <div className="mt-2">
              <p className="text-xs uppercase tracking-wide text-slate-600">Still need your vote:</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {myMissingRequired.map((s) => (
                  <li key={s.id} className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    {s.dayName} {s.mealType}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="space-y-8">
        {days.map(([day, daySlots]) => (
          <section key={day}>
            <h2 className="font-serif text-2xl font-medium text-slate-900 mb-3">{day}</h2>
            <div className="space-y-3">
              {daySlots.map((slot) => (
                <MealSlotCard
                  key={slot.id}
                  slot={slot}
                  phase={phase}
                  isAdmin={isAdmin}
                  currentUserId={currentUserId}
                  myVote={myVotes.get(slot.id)}
                  busy={busy}
                  run={run}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {phase === "finalized" && (
        <GroceryList slots={slots} isAdmin={isAdmin} run={run} />
      )}

      {showSuggestModal && (
        <SuggestModal
          slots={slots}
          presetSlotId={null}
          onClose={() => setShowSuggestModal(false)}
          onSubmit={async (fd) => {
            await run("create", () => createSuggestion(fd));
            setShowSuggestModal(false);
          }}
        />
      )}

      <input type="hidden" value={tripId} readOnly className="hidden" />
    </div>
  );
}

function AdminPhaseControls({
  tripId,
  phase,
  completion,
  run,
}: {
  tripId: string;
  phase: Phase;
  completion: CompletionSummary | null;
  run: <T>(label: string, fn: () => Promise<T>) => Promise<void>;
}) {
  const [showCompletion, setShowCompletion] = useState(false);

  return (
    <div className="bg-slate-950 text-slate-100 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Admin controls</p>
        <div className="flex flex-wrap gap-2">
          {phase === "suggestions_open" && (
            <button
              onClick={() => run("phase-vote", () => setPhase(tripId, "voting_open"))}
              className="min-w-[44px] inline-flex items-center justify-center text-xs px-3 min-h-[44px] bg-slate-100 text-slate-900 rounded-lg font-medium hover:bg-white"
            >
              Open voting →
            </button>
          )}
          {phase === "voting_open" && (
            <>
              <button
                onClick={() => run("phase-fin", () => setPhase(tripId, "admin_finalizing"))}
                className="min-w-[44px] inline-flex items-center justify-center text-xs px-3 min-h-[44px] bg-slate-100 text-slate-900 rounded-lg font-medium hover:bg-white"
              >
                Close voting →
              </button>
              <button
                onClick={() => run("phase-suggest", () => setPhase(tripId, "suggestions_open"))}
                className="min-w-[44px] inline-flex items-center justify-center text-xs px-3 min-h-[44px] border border-slate-600 text-slate-200 rounded-lg hover:bg-indigo-700"
              >
                ← Reopen suggestions
              </button>
            </>
          )}
          {phase === "admin_finalizing" && (
            <>
              <button
                onClick={() => run("phase-final", () => setPhase(tripId, "finalized"))}
                className="min-w-[44px] inline-flex items-center justify-center text-xs px-3 min-h-[44px] bg-emerald-300 text-emerald-950 rounded-lg font-medium hover:bg-emerald-200"
              >
                Finalize meals
              </button>
              <button
                onClick={() => {
                  if (!confirm("Finalize anyway, even though some users haven't voted?")) return;
                  run("phase-force", () => setPhase(tripId, "finalized", { force: true }));
                }}
                className="min-w-[44px] inline-flex items-center justify-center text-xs px-3 min-h-[44px] border border-amber-400 text-amber-200 rounded-lg hover:bg-indigo-700"
              >
                Finalize anyway (override)
              </button>
              <button
                onClick={() => run("phase-vote-back", () => setPhase(tripId, "voting_open"))}
                className="min-w-[44px] inline-flex items-center justify-center text-xs px-3 min-h-[44px] border border-slate-600 text-slate-200 rounded-lg hover:bg-indigo-700"
              >
                ← Reopen voting
              </button>
            </>
          )}
          {phase === "finalized" && (
            <button
              onClick={() => {
                if (!confirm("Reopen suggestions? Confirmed meals stay confirmed but you can re-edit.")) return;
                run("phase-reset", () => setPhase(tripId, "suggestions_open"));
              }}
              className="min-w-[44px] inline-flex items-center justify-center text-xs px-3 min-h-[44px] border border-slate-600 text-slate-200 rounded-lg hover:bg-indigo-700"
            >
              ← Reopen suggestions
            </button>
          )}
        </div>
      </div>

      {phase === "voting_open" && completion && (
        <div className="text-sm">
          <p className="text-slate-300">
            <span className="font-medium text-slate-100">{completion.usersComplete}</span> of{" "}
            <span className="text-slate-100">{completion.totalUsers}</span> users finished voting
            {completion.usersIncomplete > 0 && (
              <>
                {" "}· <span className="text-amber-300">{completion.usersIncomplete} pending</span>
                <button
                  onClick={() => setShowCompletion((s) => !s)}
                  className="min-w-[44px] min-h-[44px] ml-2 text-xs underline underline-offset-2 text-slate-300 hover:text-white"
                >
                  {showCompletion ? "Hide" : "Show who"}
                </button>
              </>
            )}
          </p>
          {showCompletion && completion.incompleteUsers.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {completion.incompleteUsers.map((u) => (
                <li
                  key={u.id}
                  className="text-xs px-2 py-0.5 rounded bg-amber-200/20 border border-amber-400/40 text-amber-200"
                >
                  {u.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function MealSlotCard({
  slot,
  phase,
  isAdmin,
  currentUserId,
  myVote,
  busy,
  run,
}: {
  slot: SlotRow;
  phase: Phase;
  isAdmin: boolean;
  currentUserId: string;
  myVote: VoteRow | undefined;
  busy: string | null;
  run: <T>(label: string, fn: () => Promise<T>) => Promise<void>;
}) {
  const slotLabel = `${slot.dayName} ${slot.mealType}`;
  const suggCount = slot.suggestions.length;

  const tally = new Map<string, number>();
  let dontCareCount = 0;
  for (const v of slot.votes) {
    if (v.isDontCare) dontCareCount += 1;
    else if (v.suggestionId) tally.set(v.suggestionId, (tally.get(v.suggestionId) ?? 0) + 1);
  }
  const recommended = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  const confirmedSuggestion = slot.confirmedSuggestionId
    ? slot.suggestions.find((s) => s.id === slot.confirmedSuggestionId) ?? null
    : null;

  return (
    <article className="min-w-0 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm md:p-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-medium text-slate-900">
            {slotLabel}
            {slot.isOptional && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                Optional
              </span>
            )}
          </h3>
          {(phase === "suggestions_open" || phase === "voting_open") && (
            <p className="text-xs text-slate-600 mt-0.5">
              Poll · {suggCount === 0 ? "no ideas yet" : `${suggCount} idea${suggCount === 1 ? "" : "s"}`} · {slot.votes.length} {slot.votes.length === 1 ? "vote" : "votes"}
            </p>
          )}
          {phase === "admin_finalizing" && (
            <p className="text-xs text-slate-600 mt-0.5">
              {tally.size === 0 ? "No votes yet" : `${slot.votes.length} votes in`}
            </p>
          )}
        </div>
        {phase === "finalized" && (
          <span
            className={`text-xs px-2 py-1 rounded ${
              slot.status === "HANDLED"
                ? "bg-emerald-100 text-emerald-900"
                : slot.status === "GROCERIES_BOUGHT"
                ? "bg-blue-100 text-blue-900"
                : slot.status === "CONFIRMED"
                ? "bg-slate-200 text-slate-800"
                : "bg-amber-100 text-amber-900"
            }`}
          >
            {slot.status === "PENDING" ? "Awaiting confirmation" : slot.status.replace("_", " ").toLowerCase()}
          </span>
        )}
      </header>

      {(phase === "suggestions_open" || phase === "voting_open") && !isAdmin && (
        <PollBody
          slot={slot}
          myVote={myVote}
          tally={tally}
          dontCareCount={dontCareCount}
          currentUserId={currentUserId}
          busy={busy}
          run={run}
        />
      )}

      {(phase === "suggestions_open" || phase === "voting_open") && isAdmin && (
        <div className="mt-3 space-y-1.5">
          {slot.suggestions.length === 0 ? (
            <p className="text-xs text-slate-600 italic">No ideas yet.</p>
          ) : (
            slot.suggestions.map((s) => {
              const count = tally.get(s.id) ?? 0;
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                >
                  <span className="min-w-0 break-words">
                    <span className="font-semibold text-slate-900 break-words">{s.mealName}</span>
                    <span className="text-slate-600"> · {s.submittedBy.name}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 tabular-nums">
                      {count} {count === 1 ? "vote" : "votes"}
                    </span>
                    <button
                      onClick={() => run("del-" + s.id, () => deleteSuggestion(s.id))}
                      className="min-w-[44px] min-h-[44px] text-xs text-slate-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </span>
                </div>
              );
            })
          )}
          <p className="text-xs text-slate-600">
            &ldquo;I don&apos;t care&rdquo; · <span className="tabular-nums">{dontCareCount}</span>
          </p>
        </div>
      )}

      {phase === "admin_finalizing" && isAdmin && (
        <div className="mt-3 space-y-3">
          {slot.suggestions.length === 0 ? (
            <p className="text-xs text-slate-600 italic">No suggestions for this slot.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {[...slot.suggestions]
                .sort((a, b) => (tally.get(b.id) ?? 0) - (tally.get(a.id) ?? 0))
                .map((s) => {
                  const count = tally.get(s.id) ?? 0;
                  const isWinner = recommended && recommended[0] === s.id;
                  const isConfirmed = slot.confirmedSuggestionId === s.id;
                  return (
                    <li
                      key={s.id}
                      className={`flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-lg border ${
                        isConfirmed
                          ? "border-emerald-300 bg-emerald-50"
                          : isWinner
                          ? "border-slate-700 bg-slate-50"
                          : "border-slate-200"
                      }`}
                    >
                      <span className="min-w-0 break-words">
                        <span className="font-semibold text-slate-900 break-words">{s.mealName}</span>
                        <span className="text-slate-600 text-xs"> · {s.submittedBy.name}</span>
                        {isWinner && !isConfirmed && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                            Recommended
                          </span>
                        )}
                        {isConfirmed && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                            Confirmed
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 tabular-nums">{count} votes</span>
                        {!isConfirmed && (
                          <button
                            onClick={() => run("conf-" + s.id, () => confirmMeal(slot.id, s.id))}
                            className="min-w-[44px] min-h-[44px] text-xs px-2 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                          >
                            Confirm
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })}
              <li className="text-xs text-slate-600 mt-1">
                &ldquo;I don&apos;t care&rdquo; · {dontCareCount}
              </li>
            </ul>
          )}
        </div>
      )}

      {phase === "admin_finalizing" && !isAdmin && (
        <p className="text-xs text-slate-600 italic mt-3">Voting closed. Admin is finalizing.</p>
      )}

      {phase === "finalized" && (
        <FinalSlotPanel
          slot={slot}
          isAdmin={isAdmin}
          confirmedSuggestion={confirmedSuggestion}
          run={run}
        />
      )}
    </article>
  );
}


function SuggestFormFields({
  slots,
  presetSlotId,
}: {
  slots: SlotRow[];
  presetSlotId: string | null;
}) {
  const fieldsId = useId();
  const inputCls =
    "w-full min-h-[44px] px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20";
  return (
    <>
      <div>
        <label htmlFor={`${fieldsId}-name`} className="block text-xs font-medium text-slate-700 mb-1.5 tracking-wide">MEAL NAME *</label>
        <input id={`${fieldsId}-name`} name="mealName" required className={inputCls} placeholder="e.g. Taco Bar" />
      </div>
      {presetSlotId ? (
        <input type="hidden" name="mealSlotId" value={presetSlotId} />
      ) : (
        <div>
          <label htmlFor={`${fieldsId}-slot`} className="block text-xs font-medium text-slate-700 mb-1.5 tracking-wide">SLOT *</label>
          <select id={`${fieldsId}-slot`} name="mealSlotId" required className={inputCls}>
            <option value="">Pick a slot…</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.dayName} {s.mealType}{s.isOptional ? " (optional)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor={`${fieldsId}-note`} className="block text-xs font-medium text-slate-700 mb-1.5 tracking-wide">
          NOTE (why is this good for the group?)
        </label>
        <textarea id={`${fieldsId}-note`} name="note" rows={2} className={`${inputCls} resize-none`} placeholder="Optional" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1.5 tracking-wide">HELP OFFERED</label>
        <div className="flex flex-wrap gap-2">
          {HELP_OPTIONS.map((h) => (
            <label key={h.value} className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" name="helpOffered" value={h.value} className="accent-indigo-600" />
              {h.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1.5 tracking-wide">DIETARY TAGS</label>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((d) => (
            <label key={d} className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" name="dietaryTags" value={d} className="accent-indigo-600" />
              {d}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

function PollBody({
  slot,
  myVote,
  tally,
  dontCareCount,
  currentUserId,
  busy,
  run,
}: {
  slot: SlotRow;
  myVote: VoteRow | undefined;
  tally: Map<string, number>;
  dontCareCount: number;
  currentUserId: string;
  busy: string | null;
  run: <T>(label: string, fn: () => Promise<T>) => Promise<void>;
}) {
  const totalVotes = slot.votes.length;
  return (
    <div className="mt-3 space-y-2">
      <div className="space-y-1.5" role="radiogroup" aria-label={`${slot.dayName} ${slot.mealType} poll`}>
        {slot.suggestions.map((s) => {
          const count = tally.get(s.id) ?? 0;
          const isMine = myVote?.suggestionId === s.id;
          const canDelete = s.submittedByUserId === currentUserId;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          return (
            <label
              key={s.id}
              className={`relative flex min-h-[44px] items-start gap-3 px-3 py-3 rounded-lg border cursor-pointer overflow-hidden ${
                isMine ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-indigo-600/5"
                style={{ width: `${pct}%` }}
              />
              <input
                type="radio"
                name={`vote-${slot.id}`}
                checked={isMine}
                disabled={busy !== null}
                onChange={() => run("vote-" + slot.id, () => castVote(slot.id, s.id, false))}
                className="h-4 w-4 shrink-0 mt-1 accent-indigo-600 relative z-10"
              />
              <span className="min-w-0 flex-1 break-words text-sm relative z-10">
                <span className="font-semibold text-slate-900 break-words">{s.mealName}</span>
                <span className="text-slate-600"> · {s.submittedBy.name}</span>
                {s.note && <span className="block text-xs text-slate-600 mt-0.5">{s.note}</span>}
                <span className="flex flex-wrap gap-1 mt-1">
                  {s.helpOffered.map((h) => (
                    <span key={h} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-900">
                      {h.replace("_", " ")}
                    </span>
                  ))}
                  {s.dietaryTags.map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      {t}
                    </span>
                  ))}
                </span>
              </span>
              <span className="relative z-10 flex flex-col items-end gap-0.5">
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 tabular-nums">
                  {count} {count === 1 ? "vote" : "votes"}
                </span>
                {canDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      run("del-" + s.id, () => deleteSuggestion(s.id));
                    }}
                    className="min-w-[44px] min-h-[44px] text-xs text-slate-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </span>
            </label>
          );
        })}

        <label
          className={`relative flex min-h-[44px] items-start gap-3 px-3 py-3 rounded-lg border cursor-pointer overflow-hidden ${
            myVote?.isDontCare ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200 hover:bg-slate-50"
          }`}
        >
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 bg-indigo-600/5"
            style={{
              width: `${totalVotes > 0 ? Math.round((dontCareCount / totalVotes) * 100) : 0}%`,
            }}
          />
          <input
            type="radio"
            name={`vote-${slot.id}`}
            checked={!!myVote?.isDontCare}
            disabled={busy !== null}
            onChange={() => run("vote-" + slot.id, () => castVote(slot.id, null, true))}
            className="h-4 w-4 shrink-0 mt-1 accent-indigo-600 relative z-10"
          />
          <span className="flex-1 text-sm text-slate-700 italic relative z-10">I don&apos;t care</span>
          <span className="relative z-10 text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 tabular-nums">
            {dontCareCount} {dontCareCount === 1 ? "vote" : "votes"}
          </span>
        </label>
      </div>

      <QuickSuggestForm slot={slot} busy={busy} run={run} />

      {myVote && (
        <p className="text-xs text-slate-600">
          Your vote:{" "}
          {myVote.isDontCare
            ? "I don't care"
            : `"${slot.suggestions.find((s) => s.id === myVote.suggestionId)?.mealName ?? "?"}"`}
          . You can change it anytime.
        </p>
      )}
    </div>
  );
}

function QuickSuggestForm({
  slot,
  busy,
  run,
}: {
  slot: SlotRow;
  busy: string | null;
  run: <T>(label: string, fn: () => Promise<T>) => Promise<void>;
}) {
  const [name, setName] = useState("");
  return (
    <form
      className="flex items-stretch gap-2 mt-1"
      onSubmit={async (e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        const fd = new FormData();
        fd.set("mealSlotId", slot.id);
        fd.set("mealName", trimmed);
        await run("suggest-" + slot.id, () => createSuggestion(fd));
        setName("");
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Suggest a new idea (e.g. BBQ)"
        enterKeyHint="send"
        className="flex-1 min-w-0 px-3 min-h-[44px] rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
      />
      <button
        type="submit"
        disabled={busy !== null || !name.trim()}
        className="min-w-[44px] inline-flex items-center justify-center shrink-0 px-3 min-h-[44px] bg-indigo-600 text-white text-sm rounded-lg font-medium hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40"
      >
        Submit
      </button>
    </form>
  );
}

function SuggestModal({
  slots,
  presetSlotId,
  onClose,
  onSubmit,
}: {
  slots: SlotRow[];
  presetSlotId: string | null;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-label="Suggest a meal" onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-serif text-xl font-medium text-slate-900 mb-4">Suggest a meal</h3>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            await onSubmit(fd);
          }}
        >
          <SuggestFormFields slots={slots} presetSlotId={presetSlotId} />
          <div className="flex gap-2 pt-2">
            <button type="submit" className="min-w-[44px] min-h-[44px] text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">
              Add suggestion
            </button>
            <button type="button" onClick={onClose} className="min-w-[44px] min-h-[44px] text-sm px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FinalSlotPanel({
  slot,
  isAdmin,
  confirmedSuggestion,
  run,
}: {
  slot: SlotRow;
  isAdmin: boolean;
  confirmedSuggestion: Suggestion | null;
  run: <T>(label: string, fn: () => Promise<T>) => Promise<void>;
}) {
  return (
    <div className="mt-3 space-y-3">
      {confirmedSuggestion ? (
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="font-serif text-lg font-semibold text-slate-900 break-words">{confirmedSuggestion.mealName}</p>
          {confirmedSuggestion.note && (
            <p className="text-sm text-slate-700 mt-1">{confirmedSuggestion.note}</p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {confirmedSuggestion.dietaryTags.map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                {t}
              </span>
            ))}
          </div>
          {slot.adminOverrideNote && (
            <p className="text-xs text-amber-800 mt-2 italic">Admin note: {slot.adminOverrideNote}</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-600 italic">Not yet confirmed.</p>
      )}

      {slot.helpers.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-600">Helpers</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {slot.helpers.map((h) => (
              <li key={h.id} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-900">
                {h.user.name} · {h.helpType}
              </li>
            ))}
          </ul>
        </div>
      )}

      {slot.groceries.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-600">Groceries</p>
          <ul className="mt-1 space-y-0.5 text-sm">
            {slot.groceries.map((g) => (
              <li key={g.id} className={g.bought ? "text-slate-600 line-through" : "text-slate-700"}>
                · {g.name}
                {g.quantity && <span className="text-slate-600"> ({g.quantity})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAdmin && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {slot.status !== "GROCERIES_BOUGHT" && (
            <button
              onClick={() => run("st-" + slot.id, () => setSlotStatus(slot.id, "GROCERIES_BOUGHT"))}
              className="min-w-[44px] inline-flex items-center justify-center text-xs px-2.5 min-h-[44px] border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
            >
              Mark groceries bought
            </button>
          )}
          {slot.status !== "HANDLED" && (
            <button
              onClick={() => run("st-" + slot.id, () => setSlotStatus(slot.id, "HANDLED"))}
              className="min-w-[44px] inline-flex items-center justify-center text-xs px-2.5 min-h-[44px] border border-emerald-400 text-emerald-800 rounded-lg hover:bg-emerald-50"
            >
              Mark handled
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function GroceryList({
  slots,
  isAdmin,
  run,
}: {
  slots: SlotRow[];
  isAdmin: boolean;
  run: <T>(label: string, fn: () => Promise<T>) => Promise<void>;
}) {
  const [open, setOpen] = useState<string | null>(null);

  const byCategory = new Map<string, { item: GroceryItemRow; slot: SlotRow }[]>();
  for (const s of slots) {
    for (const g of s.groceries) {
      if (!byCategory.has(g.category)) byCategory.set(g.category, []);
      byCategory.get(g.category)!.push({ item: g, slot: s });
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <header>
        <h2 className="font-serif text-2xl font-medium text-slate-900">Grocery list</h2>
        <p className="text-slate-600 text-sm">
          Pulled from confirmed meals. Check things off as you shop.
        </p>
      </header>

      {GROCERY_CATEGORIES.map((cat) => {
        const items = byCategory.get(cat) ?? [];
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            <p className="text-xs uppercase tracking-wide text-slate-600 mb-1">{cat}</p>
            <ul className="space-y-1">
              {items.map(({ item, slot }) => (
                <li key={item.id} className="flex flex-wrap items-center gap-x-2 text-sm">
                  {isAdmin ? (
                    <label className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-indigo-50">
                      <input
                        type="checkbox"
                        aria-label={`Mark ${item.name} as bought`}
                        checked={item.bought}
                        onChange={(e) => run("buy-" + item.id, () => toggleBought(item.id, e.target.checked))}
                        className="h-4 w-4 accent-indigo-600"
                      />
                    </label>
                  ) : (
                    <span className="w-4">{item.bought ? "✓" : "·"}</span>
                  )}
                  <span className={item.bought ? "text-slate-600 line-through" : "text-slate-800"}>
                    {item.name}
                    {item.quantity && <span className="text-slate-600"> ({item.quantity})</span>}
                  </span>
                  <span className="text-xs text-slate-600">— {slot.dayName} {slot.mealType}</span>
                  {isAdmin && (
                    <button
                      onClick={() => run("del-" + item.id, () => deleteGroceryItem(item.id))}
                      className="min-w-[44px] min-h-[44px] ml-auto text-xs text-slate-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {isAdmin && (
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs uppercase tracking-wide text-slate-600 mb-2">Add an item</p>
          {slots.filter((s) => s.confirmedSuggestionId).map((s) => (
            <div key={s.id} className="mb-2">
              <button
                onClick={() => setOpen(open === s.id ? null : s.id)}
                className="min-w-[44px] min-h-[44px] text-xs text-slate-700 underline underline-offset-2 hover:text-slate-900"
              >
                {open === s.id ? "Cancel" : `+ Add to ${s.dayName} ${s.mealType}`}
              </button>
              {open === s.id && (
                <form
                  className="mt-2 grid grid-cols-2 gap-2 items-end sm:grid-cols-12"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    fd.append("mealSlotId", s.id);
                    await run("add-g", () => addGroceryItem(fd));
                    (e.target as HTMLFormElement).reset();
                  }}
                >
                  <input aria-label="Grocery item" name="name" required placeholder="Item" className="col-span-2 min-w-0 min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 text-sm sm:col-span-4" />
                  <select aria-label="Grocery category" name="category" className="min-w-0 min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 text-sm sm:col-span-3">
                    {GROCERY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input aria-label="Grocery quantity" name="quantity" placeholder="Qty" className="min-w-0 min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 text-sm sm:col-span-3" />
                  <button className="min-w-[44px] col-span-2 min-h-[44px] px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Add</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
