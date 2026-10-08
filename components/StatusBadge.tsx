import { UserStatus } from "@prisma/client";

const statusConfig: Record<UserStatus, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-slate-100 text-slate-700 border border-slate-200" },
  APPROVED: { label: "Approved", className: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  CONFIRMED_PAID: { label: "Confirmed & Paid", className: "bg-emerald-50 text-emerald-800 border border-emerald-200" },
  PENDING_PAYMENT: { label: "Payment Due", className: "bg-amber-50 text-amber-800 border border-amber-200" },
  CANCELLED: { label: "Cancelled", className: "bg-rose-50 text-rose-800 border border-rose-200" },
};

export function StatusBadge({ status }: { status: UserStatus }) {
  const config = statusConfig[status] ?? statusConfig.PENDING;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
