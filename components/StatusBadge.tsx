import { UserStatus } from "@prisma/client";

const statusConfig: Record<UserStatus, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-gray-100 text-gray-700 border border-gray-300" },
  APPROVED: { label: "Approved", className: "bg-blue-100 text-blue-700 border border-blue-300" },
  CONFIRMED_PAID: { label: "Confirmed & Paid", className: "bg-green-100 text-green-700 border border-green-300" },
  PENDING_PAYMENT: { label: "Payment Due", className: "bg-yellow-100 text-yellow-700 border border-yellow-300" },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700 border border-red-300" },
};

export function StatusBadge({ status }: { status: UserStatus }) {
  const config = statusConfig[status] ?? statusConfig.PENDING;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
