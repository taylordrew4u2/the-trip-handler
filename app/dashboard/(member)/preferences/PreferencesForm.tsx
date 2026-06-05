"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePreferences } from "@/app/actions/guestForm";
import type { GuestForm } from "@prisma/client";

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900";

function Section({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-stone-200 pt-8 mt-8 first:border-t-0 first:pt-0 first:mt-0">
      <h2 className="font-serif text-2xl font-medium text-stone-900">{title}</h2>
      {intro && <p className="text-sm text-stone-600 mt-2 leading-relaxed">{intro}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, children, required }: { label: string; hint?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-800">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {hint && <p className="text-xs text-stone-500 mt-0.5">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function TextInput(props: { name: string; defaultValue?: string | null; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <input
      name={props.name}
      type={props.type ?? "text"}
      defaultValue={props.defaultValue ?? ""}
      placeholder={props.placeholder}
      required={props.required}
      className={inputCls}
    />
  );
}

function TextArea(props: { name: string; defaultValue?: string | null; placeholder?: string; rows?: number; required?: boolean }) {
  return (
    <textarea
      name={props.name}
      defaultValue={props.defaultValue ?? ""}
      placeholder={props.placeholder}
      rows={props.rows ?? 3}
      required={props.required}
      className={`${inputCls} resize-none`}
    />
  );
}

function RadioGroup({ name, options, defaultValue, required }: {
  name: string; options: { value: string; label: string }[]; defaultValue?: string | null; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      {options.map((opt, i) => (
        <label key={opt.value} className="flex items-center gap-2.5 text-sm text-stone-800 cursor-pointer">
          <input
            type="radio"
            name={name}
            value={opt.value}
            defaultChecked={defaultValue === opt.value}
            required={required && i === 0}
            className="h-4 w-4 accent-stone-900"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

function CheckboxGroup({ name, options, defaultValue }: {
  name: string; options: { value: string; label: string }[]; defaultValue?: string[];
}) {
  const set = new Set(defaultValue ?? []);
  return (
    <div className="space-y-1.5">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-start gap-2.5 text-sm text-stone-800 cursor-pointer">
          <input
            type="checkbox"
            name={`${name}[]`}
            value={opt.value}
            defaultChecked={set.has(opt.value)}
            className="h-4 w-4 mt-0.5 accent-stone-900"
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
const YES_NO_SOMETIMES = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "sometimes", label: "Sometimes" },
];

export function PreferencesForm({ existing }: { existing: GuestForm | null }) {
  const router = useRouter();
  const e = existing;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(
    e?.preferencesSubmittedAt ? new Date(e.preferencesSubmittedAt).toLocaleString() : null
  );

  async function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setSubmitting(true);
    setError("");
    const fd = new FormData(ev.currentTarget);
    const result = await updatePreferences(fd);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSavedAt(new Date().toLocaleString());
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-xl p-6 md:p-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-6 text-sm">
          {error}
        </div>
      )}
      {savedAt && !error && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 mb-6 text-sm">
          Saved {savedAt}. Update any time.
        </div>
      )}

      <Section title="Emergency contact">
        <Field label="Emergency contact name" required>
          <TextInput name="emergencyName" defaultValue={e?.emergencyName} required />
        </Field>
        <Field label="Emergency contact phone number" required>
          <TextInput name="emergencyPhone" type="tel" defaultValue={e?.emergencyPhone} required />
        </Field>
      </Section>

      <Section title="Van transportation" intro="Transportation will be handled by rental vans. Everyone needs to be on time for pickup and departure.">
        <Field label="Where will you be coming from?" required>
          <TextInput name="comingFrom" defaultValue={e?.comingFrom} required placeholder="e.g. Brooklyn, NJ, etc." />
        </Field>
        <Field label="Can you meet at one central pickup location?" required>
          <RadioGroup
            name="centralPickup"
            defaultValue={e?.centralPickup}
            required
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "depends", label: "Depends where it is" },
            ]}
          />
        </Field>
        <Field label="Preferred pickup area" required>
          <RadioGroup
            name="preferredArea"
            defaultValue={e?.preferredArea}
            required
            options={[
              { value: "Manhattan", label: "Manhattan" },
              { value: "Brooklyn", label: "Brooklyn" },
              { value: "Queens", label: "Queens" },
              { value: "New Jersey", label: "New Jersey" },
              { value: "Other", label: "Other" },
            ]}
          />
          <div className="mt-2">
            <TextInput name="preferredAreaOther" defaultValue={e?.preferredAreaOther} placeholder="If other, specify (or N/A)" />
          </div>
        </Field>
        <Field label="Do you get carsick?" required>
          <RadioGroup name="carsick" defaultValue={e?.carsick} options={YES_NO_SOMETIMES} required />
        </Field>
        <Field label="Do you need the front seat for medical, anxiety, or motion sickness reasons?" required>
          <RadioGroup name="needsFrontSeat" defaultValue={e?.needsFrontSeat} options={YES_NO} required />
        </Field>
        <Field label="Are you bringing luggage?" required>
          <RadioGroup
            name="luggageSize"
            defaultValue={e?.luggageSize}
            required
            options={[
              { value: "Backpack only", label: "Backpack only" },
              { value: "Small overnight bag", label: "Small overnight bag" },
              { value: "Suitcase", label: "Suitcase" },
              { value: "Too much", label: "Too much" },
            ]}
          />
        </Field>
        <Field label="Are you bringing anything bulky?" hint="Camera gear, guitar, cooler, sleeping bag, air mattress, etc." required>
          <TextInput name="bulkyItems" defaultValue={e?.bulkyItems} required placeholder="N/A if nothing bulky" />
        </Field>
        <Field label="Are you willing to drive one of the rental vans if needed?" required>
          <RadioGroup name="willingToDrive" defaultValue={e?.willingToDrive} options={YES_NO} required />
        </Field>
        <Field label="Acknowledgement" required>
          <label className="flex items-start gap-2.5 text-sm text-stone-800 cursor-pointer">
            <input type="checkbox" name="vanAck" defaultChecked={e?.vanAck} required className="h-4 w-4 mt-0.5 accent-stone-900" />
            I understand transportation is being coordinated by van and I need to be on time for pickup and departure.
          </label>
        </Field>
      </Section>

      <Section title="Food / allergies" intro="I'll be buying groceries and planning meals, so list everything clearly. Use “N/A” if a question doesn't apply.">
        <Field label="Do you have any food allergies?" required>
          <RadioGroup name="hasAllergies" defaultValue={e?.hasAllergies} options={YES_NO} required />
        </Field>
        <Field label="If yes, list them here" required>
          <TextArea name="allergiesList" defaultValue={e?.allergiesList} required placeholder="N/A if none" />
        </Field>
        <Field label="How serious is the allergy?" required>
          <RadioGroup
            name="allergySeverity"
            defaultValue={e?.allergySeverity}
            required
            options={[
              { value: "mild", label: "Mild" },
              { value: "serious", label: "Serious" },
              { value: "cross-contamination", label: "Cross-contamination issue" },
              { value: "airborne", label: "Airborne allergy" },
              { value: "epipen", label: "EpiPen needed" },
              { value: "n/a", label: "Not applicable" },
            ]}
          />
        </Field>
        <Field label="Do you have any dietary restrictions?">
          <CheckboxGroup
            name="dietaryRestrictions"
            defaultValue={e?.dietaryRestrictions}
            options={[
              { value: "Vegetarian", label: "Vegetarian" },
              { value: "Vegan", label: "Vegan" },
              { value: "Gluten-free", label: "Gluten-free" },
              { value: "Dairy-free", label: "Dairy-free" },
              { value: "Kosher", label: "Kosher" },
              { value: "Halal", label: "Halal" },
              { value: "No pork", label: "No pork" },
              { value: "No red meat", label: "No red meat" },
              { value: "None", label: "None" },
            ]}
          />
          <div className="mt-2">
            <TextInput name="dietaryOther" defaultValue={e?.dietaryOther} placeholder="Other (or N/A)" />
          </div>
        </Field>
        <Field label="Foods you absolutely will not eat" required>
          <TextArea name="willNotEat" defaultValue={e?.willNotEat} rows={2} required placeholder="N/A if you'll eat anything" />
        </Field>
        <Field label="Foods you actually like" required>
          <TextArea name="likedFoods" defaultValue={e?.likedFoods} rows={2} required placeholder="N/A if no preference" />
        </Field>
        <Field label="Snack requests" required>
          <TextArea name="snackRequests" defaultValue={e?.snackRequests} rows={2} required placeholder="N/A if no requests" />
        </Field>
        <Field label="Drink preferences">
          <CheckboxGroup
            name="drinkPrefs"
            defaultValue={e?.drinkPrefs}
            options={[
              { value: "Coffee", label: "Coffee" },
              { value: "Tea", label: "Tea" },
              { value: "Seltzer", label: "Seltzer" },
              { value: "Soda", label: "Soda" },
              { value: "Juice", label: "Juice" },
              { value: "Energy drinks", label: "Energy drinks" },
              { value: "Water", label: "Water" },
            ]}
          />
          <div className="mt-2">
            <TextInput name="drinkOther" defaultValue={e?.drinkOther} placeholder="Other (or N/A)" />
          </div>
        </Field>
        <Field label="Are you okay with communal meals?" required>
          <RadioGroup
            name="communalMeals"
            defaultValue={e?.communalMeals}
            required
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "some", label: "Some meals only" },
            ]}
          />
        </Field>
        <Field label="Are you willing to help cook or clean?" required>
          <RadioGroup
            name="helpCookClean"
            defaultValue={e?.helpCookClean}
            required
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "cleanOnly", label: "I can help clean but not cook" },
              { value: "cookOnly", label: "I can help cook but not clean" },
            ]}
          />
        </Field>
      </Section>

      <Section title="Activities / workshop" intro="Helps shape the itinerary.">
        <Field
          label="What are you hoping to work on?"
          required
          hint="Examples: a skill you want to practice, a project to finish, content ideas, performance prep, or just relaxing."
        >
          <TextArea
            name="workOnOther"
            defaultValue={e?.workOnOther}
            rows={3}
            required
            placeholder="Type whatever — e.g. “finishing a project” or “practicing with a partner”. N/A if you're just here to vibe."
          />
        </Field>
      </Section>

      <div className="border-t border-stone-200 mt-10 pt-6 flex items-center justify-between">
        <p className="text-xs text-stone-500">All fields required. Use &ldquo;N/A&rdquo; if a question doesn&apos;t apply.</p>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {submitting ? "Saving…" : existing?.preferencesSubmittedAt ? "Update preferences" : "Save preferences"}
        </button>
      </div>
    </form>
  );
}
