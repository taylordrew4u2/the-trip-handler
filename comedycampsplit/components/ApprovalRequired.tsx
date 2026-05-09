import Link from "next/link";

export function ApprovalRequired({ what }: { what: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-8 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-3">Approval required</p>
      <h2 className="font-serif text-2xl font-medium text-stone-900 mb-3">
        {what} unlocks once you&apos;re approved
      </h2>
      <p className="text-stone-600 max-w-md mx-auto leading-relaxed">
        Admin needs to approve you before you can {what.toLowerCase()}. While you wait, you can browse
        the trip basics, edit your profile, or update your guest form.
      </p>
      <div className="mt-6">
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800"
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
