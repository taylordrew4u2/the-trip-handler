"use client";

import { createContext, useContext, useId } from "react";

/**
 * Label association, done once.
 *
 * Every form in this app had the same shape: a `<label>` with styling, a
 * sibling `<input>`, and nothing tying the two together. It looks correct and
 * reads correctly with eyes; a screen reader announces the input as unlabelled,
 * and tapping the label doesn't focus the field. axe flags it as a critical
 * `label` violation, which is what surfaced it.
 *
 * Rather than hand-writing an id for every field — which works right up until
 * someone forgets one — `Field` mints an id with `useId()` and publishes it on
 * a context. Any control rendered inside picks it up with `useFieldId()`. The
 * association can't drift, because neither side has to name the id.
 *
 * `useId()` (rather than a counter or a random value) is deliberate: it
 * produces the same id on the server and on the client, so hydration matches.
 */
const FieldIdContext = createContext<string | undefined>(undefined);
const FieldHintContext = createContext<string | undefined>(undefined);

/** The id the enclosing label points at, if there is one. */
export function useFieldId(): string | undefined {
  return useContext(FieldIdContext);
}

/** The id of the enclosing field's hint text, for `aria-describedby`. */
export function useFieldHintId(): string | undefined {
  return useContext(FieldHintContext);
}

export function FieldIdProvider({ id, children }: { id: string; children: React.ReactNode }) {
  return <FieldIdContext.Provider value={id}>{children}</FieldIdContext.Provider>;
}

export function FieldHintProvider({ id, children }: { id?: string; children: React.ReactNode }) {
  return <FieldHintContext.Provider value={id}>{children}</FieldHintContext.Provider>;
}

/**
 * A labelled field with the app's compact uppercase label style.
 *
 * Wrap a control in this and the label is wired to it automatically; the hint,
 * if there is one, is wired as `aria-describedby` so it is announced with the
 * field rather than orphaned next to it.
 */
export function Field({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <FieldIdProvider id={id}>
      <div className={className}>
        <label htmlFor={id} className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">
          {/* The asterisk is decoration; `required` on the control is what a
              screen reader announces. Reading "star" mid-label helps nobody. */}
          {label} {required && <span aria-hidden="true">*</span>}
        </label>
        <FieldHintProvider id={hintId}>{children}</FieldHintProvider>
        {hint && (
          <p id={hintId} className="text-xs text-stone-500 mt-1">
            {hint}
          </p>
        )}
      </div>
    </FieldIdProvider>
  );
}

/** Drop-in replacements that pick up the enclosing Field's id. */
export function Input(props: React.ComponentProps<"input">) {
  return <input id={useFieldId()} aria-describedby={useFieldHintId()} {...props} />;
}

export function Textarea(props: React.ComponentProps<"textarea">) {
  return <textarea id={useFieldId()} aria-describedby={useFieldHintId()} {...props} />;
}

export function Select(props: React.ComponentProps<"select">) {
  return <select id={useFieldId()} aria-describedby={useFieldHintId()} {...props} />;
}

export { useId };
