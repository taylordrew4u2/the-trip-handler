interface ExpenseCardProps {
  expense: {
    id: string;
    title: string;
    amount: number;
    category: string;
    notes: string | null;
    approved: boolean;
    receiptUrl: string | null;
    submitter: { name: string };
    createdAt: Date;
  };
  isAdmin?: boolean;
  onApprove?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ExpenseCard({ expense, isAdmin, onApprove, onDelete }: ExpenseCardProps) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${expense.approved ? "border-green-200" : "border-gray-200"}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{expense.title}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
              {expense.category}
            </span>
            {expense.approved ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">✓ Approved</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">Pending</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Submitted by {expense.submitter.name} • {new Date(expense.createdAt).toLocaleDateString()}
          </p>
          {expense.notes && <p className="text-sm text-gray-600 mt-1">{expense.notes}</p>}
          {expense.receiptUrl && (
            <a
              href={expense.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 hover:underline mt-1 inline-block"
            >
              📎 View Receipt
            </a>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 ml-4">
          <span className="font-bold text-lg text-gray-900">${expense.amount.toFixed(2)}</span>
          {isAdmin && (
            <div className="flex gap-2">
              {!expense.approved && onApprove && (
                <button
                  onClick={() => onApprove(expense.id)}
                  className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                >
                  Approve
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(expense.id)}
                  className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
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
