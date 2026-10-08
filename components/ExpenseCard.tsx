interface ExpenseCardProps {
  expense: {
    id: string;
    title: string;
    amount: number;
    category: string;
    notes: string | null;
    approved: boolean;
    receiptUrl: string | null;
    submitter: { name: string } | null;
    createdAt: Date;
  };
  isAdmin?: boolean;
  onApprove?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ExpenseCard({ expense, isAdmin, onApprove, onDelete }: ExpenseCardProps) {
  return (
    <div className="min-w-0 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 break-words">{expense.title}</h3>
            <span className="text-xs px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700">
              {expense.category}
            </span>
            {expense.approved ? (
              <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900">Approved</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900">Pending</span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {expense.submitter ? `Submitted by ${expense.submitter.name}` : "Added by admin"} · {new Date(expense.createdAt).toLocaleDateString()}
          </p>
          {expense.notes && <p className="text-sm text-slate-700 mt-2">{expense.notes}</p>}
          {expense.receiptUrl && (
            <a
              href={expense.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center min-h-[44px] text-xs text-slate-700 underline underline-offset-2 hover:text-slate-900"
            >
              View receipt →
            </a>
          )}
        </div>
        <div className="flex flex-row-reverse items-center justify-between gap-2 sm:flex-col sm:items-end sm:ml-4 sm:flex-shrink-0">
          <span className="font-semibold text-lg text-slate-900 tabular-nums">${expense.amount.toFixed(2)}</span>
          {isAdmin && (
            <div className="flex gap-2">
              {!expense.approved && onApprove && (
                <button
                  onClick={() => onApprove(expense.id)}
                  className="min-w-[44px] inline-flex items-center justify-center text-xs px-3 min-h-[44px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800"
                >
                  Approve
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(expense.id)}
                  className="min-w-[44px] inline-flex items-center justify-center text-xs px-3 min-h-[44px] border border-red-300 text-red-700 rounded-lg hover:bg-red-50 active:bg-red-100"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
