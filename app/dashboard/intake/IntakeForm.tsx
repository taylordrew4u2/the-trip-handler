"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitGuestForm, requestFormEditAccess } from "@/app/actions/guestForm";
import type { GuestForm } from "@prisma/client";
import {
  FieldHintProvider,
  FieldIdProvider,
  useFieldHintId,
  useFieldId,
  useId,
} from "@/components/forms/field";

type Existing = GuestForm | null;

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
  // The id is minted here and read by the control below through context, so
  // the label/input pair can never drift apart. See components/forms/field.tsx.
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <FieldIdProvider id={id}>
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-stone-800">
          {label}{" "}
          {/* The asterisk is decoration; `required` on the input is what a
              screen reader announces. Reading "star" mid-label helps nobody. */}
          {required && <span aria-hidden="true" className="text-red-600">*</span>}
        </label>
        {hint && <p id={hintId} className="text-xs text-stone-500 mt-0.5">{hint}</p>}
        <div className="mt-1.5">
          <FieldHintProvider id={hintId}>{children}</FieldHintProvider>
        </div>
      </div>
    </FieldIdProvider>
  );
}

const inputCls =
  "w-full px-3 py-2 min-h-[44px] rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900";

function TextInput({ name, defaultValue, placeholder, type = "text", required }: {
  name: string; defaultValue?: string | null; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <input
      id={useFieldId()}
      aria-describedby={useFieldHintId()}
      name={name}
      type={type}
      defaultValue={defaultValue ?? ""}
      placeholder={placeholder}
      required={required}
      className={inputCls}
    />
  );
}

function TextArea({ name, defaultValue, placeholder, rows = 3, required }: {
  name: string; defaultValue?: string | null; placeholder?: string; rows?: number; required?: boolean;
}) {
  return (
    <textarea
      id={useFieldId()}
      aria-describedby={useFieldHintId()}
      name={name}
      defaultValue={defaultValue ?? ""}
      placeholder={placeholder}
      rows={rows}
      required={required}
      className={`${inputCls} resize-none`}
    />
  );
}

/** A field the member can see but not change — their sign-in email. */
function ReadOnlyInput({ type, value }: { type: string; value: string }) {
  return (
    <input
      id={useFieldId()}
      aria-describedby={useFieldHintId()}
      type={type}
      value={value}
      readOnly
      disabled
      // stone-500 on a stone-100 ground is 4.4:1 — just under AA. stone-600 clears it.
      className={`${inputCls} bg-stone-100 text-stone-600 cursor-not-allowed`}
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
          <input type="checkbox" name={`${name}[]`} value={opt.value} defaultChecked={set.has(opt.value)} className="h-4 w-4 mt-0.5 accent-stone-900" />
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
const YES_NO_ASK = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "ask", label: "Ask me first" },
];

export function IntakeForm({ defaultEmail, defaultName, defaultPhone, existing, isPending = false }: {
  defaultEmail: string; defaultName: string; defaultPhone: string; existing: Existing; isPending?: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(existing ? new Date(existing.updatedAt).toLocaleString() : null);
  const [editRequested, setEditRequested] = useState(existing?.editRequested ?? false);
  const [requesting, setRequesting] = useState(false);
  const locked = Boolean(existing?.locked);
  const e = existing;

  async function handleRequestEdit() {
    setRequesting(true);
    const result = await requestFormEditAccess();
    setRequesting(false);
    if (result?.error) {
      setError(result.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setEditRequested(true);
    router.refresh();
  }

  async function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setSubmitting(true);
    setError("");
    const fd = new FormData(ev.currentTarget);
    const result = await submitGuestForm(fd);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSavedAt(new Date().toLocaleString());
    if (isPending) {
      // First submission while pending — bounce them to the dashboard which
      // will show the "Form submitted, awaiting approval" wall.
      router.push("/dashboard");
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-xl p-6 md:p-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-6 text-sm">
          {error}
        </div>
      )}
      {savedAt && !error && !locked && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 mb-6 text-sm">
          Saved {savedAt}.
        </div>
      )}
      {locked && (
        <div className="bg-stone-100 border border-stone-300 rounded-lg p-4 mb-6 flex items-start gap-3">
          <div className="flex-1">
            <p className="font-medium text-stone-900 text-sm">Form locked</p>
            <p className="text-xs text-stone-600 mt-0.5">
              {savedAt && <>Submitted {savedAt}. </>}
              {editRequested
                ? "Edit access requested — admin will review and unlock for changes."
                : "Submitted. To make changes, request edit access from admin."}
            </p>
          </div>
          {!editRequested && (
            <button
              type="button"
              onClick={handleRequestEdit}
              disabled={requesting}
              className="inline-flex items-center justify-center text-xs px-3 min-h-[30px] border border-stone-700 text-stone-900 rounded-md font-medium hover:bg-stone-900 hover:text-white disabled:opacity-50 whitespace-nowrap"
            >
              {requesting ? "Sending…" : "Request edit access"}
            </button>
          )}
          {editRequested && (
            <span className="text-xs px-2 py-1 rounded bg-amber-200 text-amber-900 font-medium whitespace-nowrap">
              Pending admin
            </span>
          )}
        </div>
      )}
      <fieldset disabled={locked} className={locked ? "opacity-60" : ""}>

      <Section title="Basic info">
        <Field label="Full name" required><TextInput name="fullName" defaultValue={e?.fullName ?? defaultName} required /></Field>
        <Field label="Stage / display name (or N/A)" required><TextInput name="stageName" defaultValue={e?.stageName} required placeholder="N/A if you don't use one" /></Field>
        <Field label="Phone number" required><TextInput name="phoneNumber" type="tel" defaultValue={e?.phoneNumber ?? defaultPhone} required /></Field>
        <Field label="Email">
          <ReadOnlyInput type="email" value={defaultEmail} />
        </Field>
        <Field label="Pronouns" required><TextInput name="pronouns" defaultValue={e?.pronouns} required placeholder="e.g. she/her, they/them, N/A" /></Field>
        <Field label="Age confirmation" required>
          <label className="flex items-center gap-2.5 text-sm text-stone-800 cursor-pointer">
            <input type="checkbox" name="age21Confirmed" defaultChecked={e?.age21Confirmed} required className="h-4 w-4 accent-stone-900" />
            I confirm I am 21 or older.
          </label>
        </Field>
      </Section>

      <Section
        title="Budget"
        intro="The trip price covers travel (rental vans + gas), all meals during the weekend, and lodging. Activity and shared-supply costs are split on top. Heads up: there's also a refundable $75 security deposit billed at payment time — that's separate from your trip share. Be honest with the cap — admin uses it to decide who gets approved."
      >
        <Field
          label="Max trip share you're willing to pay (per person, before the $75 deposit)"
          required
          hint="Examples: $500, $400-600, no hard cap. The $75 deposit is on top and refundable, so don't include it here."
        >
          <input
            name="maxBudget"
            defaultValue={e?.maxBudget ?? ""}
            required
            placeholder="e.g. $500"
            className={inputCls}
          />
        </Field>
      </Section>

      <Section
        title="Drug- and alcohol-free trip"
        intro="This is a sober weekend. No alcohol, no recreational drugs — full stop. If that's not for you, this isn't the trip."
      >
        <Field label="" required>
          <label className="flex items-start gap-2.5 text-sm text-stone-800 cursor-pointer bg-amber-50 border border-amber-300 rounded-lg p-3">
            <input
              type="checkbox"
              name="substanceFreeAck"
              defaultChecked={e?.substanceFreeAck}
              required
              className="h-4 w-4 mt-0.5 accent-stone-900"
            />
            <span>
              I understand and agree that this is a <strong>drug- and alcohol-free</strong> trip.
              I will not bring, use, or share any alcohol or recreational drugs during the weekend.
            </span>
          </label>
        </Field>
      </Section>

      <Section
        title="Bed sharing"
        intro="Heads up — you'll probably have to share a bed. You'll be able to choose who you share with. And if you're a dude, the odds are very high you'll be sharing."
      >
        <Field label="Are you OK with that?" required>
          <RadioGroup name="shareBed" defaultValue={e?.shareBed} options={YES_NO} required />
        </Field>
      </Section>

      <Section title="Medical / safety" intro="Only share what would be useful in an emergency or for planning the house. If something doesn't apply to you, just write “N/A”.">
        <Field label="Any medical conditions we should know about in case of emergency?" required>
          <TextArea name="medicalConditions" defaultValue={e?.medicalConditions} required placeholder="Write N/A if you don't have any" />
        </Field>
        <Field label="Any medications that need refrigeration?" required><RadioGroup name="refrigeratedMeds" defaultValue={e?.refrigeratedMeds} options={YES_NO} required /></Field>
        <Field label="Do you carry an EpiPen, inhaler, or other emergency medical item?" required>
          <RadioGroup name="emergencyMedItem" defaultValue={e?.emergencyMedItem} options={YES_NO} required />
        </Field>
        <Field label="Any mobility or accessibility needs?" required><TextArea name="mobilityNeeds" defaultValue={e?.mobilityNeeds} rows={2} required placeholder="N/A if none" /></Field>
        <Field label="Anything you cannot or should not do?" hint="Hiking, swimming, drinking, late nights, stairs, etc." required>
          <TextArea name="cannotDo" defaultValue={e?.cannotDo} rows={2} required placeholder="N/A if none" />
        </Field>
        <Field label="Anything that would make the weekend safer, easier, or less annoying for you?" required>
          <TextArea name="safetyNotes" defaultValue={e?.safetyNotes} required placeholder="N/A if nothing" />
        </Field>
      </Section>

      <Section title="Content / social media" intro="We'll be making content for social media during the weekend. This may include group videos, photos, sketches, recap clips, behind-the-scenes footage, and other planned content.">
        <Field label="Instagram handle" required><TextInput name="instagram" defaultValue={e?.instagram} required placeholder="@handle or N/A" /></Field>
        <Field label="TikTok handle" required><TextInput name="tiktok" defaultValue={e?.tiktok} required placeholder="@handle or N/A" /></Field>
        <Field label="Any other handle you want promoted" required><TextInput name="otherHandles" defaultValue={e?.otherHandles} required placeholder="N/A if none" /></Field>
        <Field label="Are you comfortable appearing in group photos?" required><RadioGroup name="comfortGroupPhotos" defaultValue={e?.comfortGroupPhotos} options={YES_NO_ASK} required /></Field>
        <Field label="Are you comfortable appearing in group videos?" required><RadioGroup name="comfortGroupVideos" defaultValue={e?.comfortGroupVideos} options={YES_NO_ASK} required /></Field>
        <Field label="Are you comfortable being tagged on social media?" required><RadioGroup name="comfortTagged" defaultValue={e?.comfortTagged} options={YES_NO_ASK} required /></Field>
        <Field label="Are you comfortable being part of planned group content?" required>
          <RadioGroup name="comfortPlannedContent" defaultValue={e?.comfortPlannedContent} options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "depends", label: "Depends on the idea" },
          ]} required />
        </Field>
        <Field label="Content acknowledgements">
          <CheckboxGroup name="contentAcks" defaultValue={e?.contentAcks} options={[
            { value: "filmed", label: "I am okay being filmed during group activities." },
            { value: "photographed", label: "I am okay being photographed during group activities." },
            { value: "recap", label: "I am okay appearing in recap videos from the weekend." },
            { value: "promo", label: "I am okay appearing in promotional content for future trips." },
            { value: "tagged", label: "I am okay being tagged in posts." },
            { value: "approveClips", label: "I want to approve clips before they are posted." },
            { value: "doNotFilm", label: "I do not want to be filmed or photographed." },
          ]} />
        </Field>
      </Section>

      <Section title="Material / content protection" intro="This part matters. People can create together without taking or posting each other's unfinished work. All five required.">
        <Field label="" required>
          <CheckboxGroup name="jokeProtectionAcks" defaultValue={e?.jokeProtectionAcks} options={[
            { value: "noPostMaterial", label: "No one may post my material without my permission." },
            { value: "workshopPrivate", label: "Workshop footage is private unless I approve it being posted." },
            { value: "groupOk", label: "Group/social content is okay, but my own material should not be posted without approval." },
            { value: "noRepeat", label: "I understand other people's ideas, premises, unfinished work, and personal stories should not be repeated, posted, or used without permission." },
            { value: "noPost", label: "I will not post another person's material without asking them first." },
          ]} />
        </Field>
      </Section>

      <Section title="Group activities" intro="Group activities, content creation, writing sessions, workshops, and other trip activities.">
        <Field label="Which activities are you interested in?">
          <CheckboxGroup name="activitiesInterested" defaultValue={e?.activitiesInterested} options={[
            { value: "Writing sessions", label: "Writing sessions" },
            { value: "Skill workshop", label: "Skill workshop" },
            { value: "Talent show / showcase", label: "Talent show / showcase" },
            { value: "Group games", label: "Group games" },
            { value: "Group creative projects", label: "Group creative projects" },
            { value: "Social media content", label: "Social media content" },
            { value: "Podcast-style recordings", label: "Podcast-style recordings" },
            { value: "Campfire hang", label: "Campfire hang" },
            { value: "Board/card games", label: "Board/card games" },
            { value: "Swimming", label: "Swimming" },
            { value: "Hiking/walks", label: "Hiking/walks" },
            { value: "Cooking together", label: "Cooking together" },
            { value: "Quiet writing time", label: "Quiet writing time" },
          ]} />
          <div className="mt-2"><TextInput name="activitiesOtherText" defaultValue={e?.activitiesOtherText} placeholder="Other (or N/A)" required /></div>
        </Field>
        <Field label="Any activities you do not want to do?" required><TextArea name="activitiesOptOut" defaultValue={e?.activitiesOptOut} rows={2} required placeholder="N/A if you're up for anything" /></Field>
        <Field label="Are you okay with structured activities, or do you prefer more free time?" required>
          <RadioGroup name="structurePref" defaultValue={e?.structurePref} options={[
            { value: "structure", label: "I like structure" },
            { value: "mix", label: "I want a mix" },
            { value: "freeTime", label: "I prefer mostly free time" },
          ]} required />
        </Field>
      </Section>

      <Section
        title="Security deposit"
        intro="Everyone pays a $75 security deposit before the trip. If everyone follows the rules and the house comes out clean, you get it back. If you damage the house or break a rule, your deposit is forfeit and you're on the hook for any cost beyond it. The host's name is on the rental — they shouldn't be paying for someone else's mess. All four required."
      >
        <Field label="" required>
          <CheckboxGroup name="securityDepositAcks" defaultValue={e?.securityDepositAcks} options={[
            { value: "payDeposit", label: "I will send a $75 security deposit before the trip." },
            { value: "returned", label: "I understand the deposit is returned after the trip if everyone follows the rules and there's no damage." },
            { value: "forfeitAndCharged", label: "If I break a rule or damage something, I forfeit my deposit and I'm responsible for any additional cost beyond it." },
            { value: "hostNotLiable", label: "The person whose name is on the rental is not personally liable for damage I cause — that's on me." },
          ]} />
        </Field>
      </Section>

      <Section title="House rules" intro="All eight required.">
        <Field label="" required>
          <CheckboxGroup name="houseRulesAcks" defaultValue={e?.houseRulesAcks} options={[
            { value: "shared", label: "I understand this is a shared house and I'm expected to clean up after myself." },
            { value: "food", label: "I understand food is being planned in advance and I need to list allergies and dietary restrictions honestly." },
            { value: "noStealing", label: "I understand I should not eat food that is clearly set aside for someone else." },
            { value: "quietHours", label: "I understand quiet hours may exist." },
            { value: "alcohol", label: "I understand this is a drug- and alcohol-free weekend and I will not bring or use either on the trip." },
            { value: "damage", label: "I understand I am responsible for damage I personally cause." },
            { value: "respect", label: "I understand I need to respect people's space, sleep, food needs, creative work, and boundaries." },
            { value: "groupTrip", label: "I understand this is a group trip, not a hotel, and everyone needs to help keep the house functional." },
          ]} />
        </Field>
      </Section>

      <Section title="Final notes">
        <Field label="Anything else we should know before planning the weekend?" required>
          <TextArea name="finalNotes" defaultValue={e?.finalNotes} required placeholder="N/A if nothing comes to mind" />
        </Field>
        <Field label="What would make this weekend actually fun for you?" required>
          <TextArea name="whatWouldMakeFun" defaultValue={e?.whatWouldMakeFun} required placeholder="N/A if not sure" />
        </Field>
      </Section>

      </fieldset>

      {!locked && (
        <div className="border-t border-stone-200 mt-10 pt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-stone-500">Required fields marked with <span className="text-red-600">*</span>.</p>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            {submitting
              ? "Saving…"
              : existing
                ? "Update form"
                : isPending
                  ? "Submit for approval"
                  : "Submit form"}
          </button>
        </div>
      )}
    </form>
  );
}
