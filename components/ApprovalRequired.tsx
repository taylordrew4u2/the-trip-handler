import Link from "next/link";

export function ApprovalRequired({ what }: { what: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-600 mb-3">Approval required</p>
      <h2 className="font-serif text-2xl font-medium text-slate-900 mb-3">
        {what} unlocks once you&apos;re approved
      </h2>
      <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
        Admin needs to approve you before you can {what.toLowerCase()}. While you wait, you can browse
        the trip basics, edit your profile, or update your guest form.
      </p>
      <div className="mt-6">
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
