type PaymentMethodsSummaryProps = {
  isLocked: boolean;
  cardEnabled: boolean;
  venmoHandle: string | null;
  cashAppHandle: string | null;
};

/** Show configured methods before payment opens, without exposing early-pay links. */
export function PaymentMethodsSummary({
  isLocked,
  cardEnabled,
  venmoHandle,
  cashAppHandle,
}: PaymentMethodsSummaryProps) {
  const methods = [
    ...(cardEnabled ? ["Card"] : []),
    ...(venmoHandle ? ["Venmo"] : []),
    ...(cashAppHandle ? ["Cash App"] : []),
  ];

  return (
    <section aria-labelledby="payment-methods-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 id="payment-methods-heading" className="text-lg font-semibold text-slate-900">Ways to pay</h2>
      {methods.length > 0 ? (
        <ul aria-label="Available payment methods" className="mt-3 flex flex-wrap gap-2">
          {methods.map((label) => (
            <li key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">{label}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-700">The organizer hasn&apos;t added online payment methods yet.</p>
      )}
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {!isLocked
          ? "Payments open after the organizer finalizes the trip price. Do not send money yet."
          : methods.length > 0
          ? "Choose a payment option below. Agree any other payment method with the organizer first."
          : "Arrange payment directly with the organizer, then use “I paid the organizer” below."}
      </p>
    </section>
  );
}
