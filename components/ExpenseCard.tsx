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
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-stone-900">{expense.title}</h3>
            <span className="text-xs px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
              {expense.category}
            </span>
            {expense.approved ? (
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900">Approved</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">Pending</span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {expense.submitter ? `Submitted by ${expense.submitter.name}` : "Added by admin"} · {new Date(expense.createdAt).toLocaleDateString()}
          </p>
          {expense.notes && <p className="text-sm text-stone-700 mt-2">{expense.notes}</p>}
          {expense.receiptUrl && (
            <a
              href={expense.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center min-h-[40px] text-xs text-stone-700 underline underline-offset-2 hover:text-stone-900"
            >
              View receipt →
            </a>
          )}
        </div>
        <div className="flex flex-row-reverse items-center justify-between gap-2 sm:flex-col sm:items-end sm:ml-4 sm:flex-shrink-0">
          <span className="font-semibold text-lg text-stone-900 tabular-nums">${expense.amount.toFixed(2)}</span>
          {isAdmin && (
            <div className="flex gap-2">
              {!expense.approved && onApprove && (
                <button
                  onClick={() => onApprove(expense.id)}
                  className="inline-flex items-center justify-center text-xs px-3 min-h-[28px] bg-stone-900 text-white rounded-md hover:bg-stone-800 active:bg-stone-700"
                >
                  Approve
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(expense.id)}
                  className="inline-flex items-center justify-center text-xs px-3 min-h-[28px] border border-red-300 text-red-700 rounded-md hover:bg-red-50 active:bg-red-100"
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
