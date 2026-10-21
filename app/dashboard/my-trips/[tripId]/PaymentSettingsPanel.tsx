"use client";

import { useState, useTransition } from "react";
import { updateTripPaymentSettings, updateTripPriceVisibility } from "@/app/actions/trips";

type Settings = {
  depositAmount: number;
  venmoHandle: string | null;
  cashAppHandle: string | null;
  showLineItems: boolean;
  showBedPrices: boolean;
  showPersonalAdjustment: boolean;
};

const inputCls =
  "mt-1 block w-full min-w-0 px-3 min-h-[44px] rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-600 focus:outline-none focus:border-indigo-600";

export function PaymentSettingsPanel({ tripId, settings }: { tripId: string; settings: Settings }) {
  const [deposit, setDeposit] = useState(settings.depositAmount.toString());
  const [venmo, setVenmo] = useState(settings.venmoHandle ?? "");
  const [cashApp, setCashApp] = useState(settings.cashAppHandle ?? "");
  const [vis, setVis] = useState({
    showLineItems: settings.showLineItems,
    showBedPrices: settings.showBedPrices,
    showPersonalAdjustment: settings.showPersonalAdjustment,
  });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string } | { success: boolean }>) {
    setError("");
    setSaved(false);
    startTransition(async () => {
      const result = await action();
      if ("error" in result && result.error) setError(result.error);
      else setSaved(true);
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    run(() =>
      updateTripPaymentSettings(tripId, {
        depositAmount: parseFloat(deposit),
        venmoHandle: venmo,
        cashAppHandle: cashApp,
      }),
    );
  }

  function toggle(key: keyof typeof vis) {
    const next = { ...vis, [key]: !vis[key] };
    setVis(next);
    run(() => updateTripPriceVisibility(tripId, next));
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-6 space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-950">Payment settings</h2>
        <p className="text-slate-600 text-sm leading-6 mt-2 max-w-2xl">
          Set the deposit, the ways you accept money, and what members see in their own breakdown. Members never see
          what anyone else pays.
        </p>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">
          {error}
        </div>
      )}
      {saved && !error && (
        <div role="status" className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-3 py-2 text-sm">
          Saved.
        </div>
      )}

      <form onSubmit={save} className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-slate-700">
          Security deposit ($)
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          Venmo username
          <input value={venmo} onChange={(e) => setVenmo(e.target.value)} placeholder="@you (blank = off)" className={inputCls} />
        </label>
        <label className="text-xs font-medium text-slate-700">
          Cash App $cashtag
          <input value={cashApp} onChange={(e) => setCashApp(e.target.value)} placeholder="$you (blank = off)" className={inputCls} />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="sm:col-span-3 inline-flex items-center justify-center px-4 min-h-[44px] rounded-xl bg-indigo-600 transition-colors hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50"
        >
          Save payment settings
        </button>
      </form>

      <fieldset className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
        <legend className="px-1 text-sm font-medium text-slate-900">What members see on their payment page</legend>
        <Toggle
          checked={vis.showLineItems}
          disabled={isPending}
          onChange={() => toggle("showLineItems")}
          label="Housing / transport / meals totals"
          hint="Off: members only see their share, not the trip totals behind it."
        />
        <Toggle
          checked={vis.showBedPrices}
          disabled={isPending}
          onChange={() => toggle("showBedPrices")}
          label="Bed prices"
          hint="Shows pricier/cheaper beds on the sleeping page and as a line on the bill. Off: folded into their share."
        />
        <Toggle
          checked={vis.showPersonalAdjustment}
          disabled={isPending}
          onChange={() => toggle("showPersonalAdjustment")}
          label="Their own private adjustment as its own line"
          hint="Off: folded silently into their share. The reason you wrote is never shown."
        />
      </fieldset>
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="accent-indigo-600 w-4 h-4 mt-1"
      />
      <span>
        <span className="block text-sm text-slate-900">{label}</span>
        <span className="block text-xs text-slate-600">{hint}</span>
      </span>
    </label>
  );
}
