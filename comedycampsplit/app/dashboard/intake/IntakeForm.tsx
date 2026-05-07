"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitGuestForm } from "@/app/actions/guestForm";
import type { GuestForm } from "@prisma/client";

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

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900";

function TextInput({ name, defaultValue, placeholder, type = "text", required }: {
  name: string; defaultValue?: string | null; placeholder?: string; type?: string; required?: boolean;
}) {
  return <input name={name} type={type} defaultValue={defaultValue ?? ""} placeholder={placeholder} required={required} className={inputCls} />;
}

function TextArea({ name, defaultValue, placeholder, rows = 3 }: {
  name: string; defaultValue?: string | null; placeholder?: string; rows?: number;
}) {
  return <textarea name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} rows={rows} className={`${inputCls} resize-none`} />;
}

function RadioGroup({ name, options, defaultValue }: {
  name: string; options: { value: string; label: string }[]; defaultValue?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2.5 text-sm text-stone-800 cursor-pointer">
          <input type="radio" name={name} value={opt.value} defaultChecked={defaultValue === opt.value} className="h-4 w-4 accent-stone-900" />
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
const YES_NO_DEPENDS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "depends", label: "Depends on the setup" },
];
const YES_NO_SOMETIMES = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "sometimes", label: "Sometimes" },
];
const YES_NO_ASK = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "ask", label: "Ask me first" },
];

export function IntakeForm({ userId, defaultEmail, defaultName, defaultPhone, existing }: {
  userId: string; defaultEmail: string; defaultName: string; defaultPhone: string; existing: Existing;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(existing ? new Date(existing.updatedAt).toLocaleString() : null);
  const e = existing;

  async function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setSubmitting(true);
    setError("");
    const fd = new FormData(ev.currentTarget);
    const result = await submitGuestForm(userId, fd);
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
          Saved {savedAt}. You can edit any field and re-submit at any time.
        </div>
      )}

      <Section title="Basic info">
        <Field label="Full name" required><TextInput name="fullName" defaultValue={e?.fullName ?? defaultName} required /></Field>
        <Field label="Stage name, if different"><TextInput name="stageName" defaultValue={e?.stageName} /></Field>
        <Field label="Phone number" required><TextInput name="phoneNumber" type="tel" defaultValue={e?.phoneNumber ?? defaultPhone} required /></Field>
        <Field label="Email"><input type="email" value={defaultEmail} disabled className={`${inputCls} bg-stone-100 text-stone-500 cursor-not-allowed`} /></Field>
        <Field label="Pronouns"><TextInput name="pronouns" defaultValue={e?.pronouns} placeholder="e.g. she/her, they/them" /></Field>
        <Field label="Age confirmation" required>
          <label className="flex items-center gap-2.5 text-sm text-stone-800 cursor-pointer">
            <input type="checkbox" name="age21Confirmed" defaultChecked={e?.age21Confirmed} required className="h-4 w-4 accent-stone-900" />
            I confirm I am 21 or older.
          </label>
        </Field>
        <Field label="Emergency contact name" required><TextInput name="emergencyName" defaultValue={e?.emergencyName} required /></Field>
        <Field label="Emergency contact phone number" required><TextInput name="emergencyPhone" type="tel" defaultValue={e?.emergencyPhone} required /></Field>
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
              I understand and agree that Comedy Summer Camp is a <strong>drug- and alcohol-free</strong> trip.
              I will not bring, use, or share any alcohol or recreational drugs during the weekend.
            </span>
          </label>
        </Field>
      </Section>

      <Section title="Van transportation" intro="Transportation will be handled by rental vans. Everyone needs to be on time for pickup and departure.">
        <Field label="Where will you be coming from?"><TextInput name="comingFrom" defaultValue={e?.comingFrom} /></Field>
        <Field label="Can you meet at one central pickup location?">
          <RadioGroup name="centralPickup" defaultValue={e?.centralPickup} options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "depends", label: "Depends where it is" },
          ]} />
        </Field>
        <Field label="Preferred pickup area">
          <RadioGroup name="preferredArea" defaultValue={e?.preferredArea} options={[
            { value: "Manhattan", label: "Manhattan" },
            { value: "Brooklyn", label: "Brooklyn" },
            { value: "Queens", label: "Queens" },
            { value: "New Jersey", label: "New Jersey" },
            { value: "Other", label: "Other" },
          ]} />
          <div className="mt-2"><TextInput name="preferredAreaOther" defaultValue={e?.preferredAreaOther} placeholder="If other, specify" /></div>
        </Field>
        <Field label="What time can you be ready to leave on Day 1?"><TextInput name="readyTimeDay1" defaultValue={e?.readyTimeDay1} placeholder="e.g. 9:00 AM" /></Field>
        <Field label="What time do you absolutely need to be back on Day 3?"><TextInput name="returnByDay3" defaultValue={e?.returnByDay3} placeholder="e.g. 6:00 PM" /></Field>
        <Field label="Do you get carsick?"><RadioGroup name="carsick" defaultValue={e?.carsick} options={YES_NO_SOMETIMES} /></Field>
        <Field label="Do you need the front seat for medical, anxiety, or motion sickness reasons?">
          <RadioGroup name="needsFrontSeat" defaultValue={e?.needsFrontSeat} options={YES_NO} />
        </Field>
        <Field label="Are you bringing luggage?">
          <RadioGroup name="luggageSize" defaultValue={e?.luggageSize} options={[
            { value: "Backpack only", label: "Backpack only" },
            { value: "Small overnight bag", label: "Small overnight bag" },
            { value: "Suitcase", label: "Suitcase" },
            { value: "Too much", label: "Too much" },
          ]} />
        </Field>
        <Field label="Are you bringing anything bulky?" hint="Camera gear, guitar, cooler, sleeping bag, air mattress, etc.">
          <TextInput name="bulkyItems" defaultValue={e?.bulkyItems} />
        </Field>
        <Field label="Are you willing to drive one of the rental vans if needed?">
          <RadioGroup name="willingToDrive" defaultValue={e?.willingToDrive} options={YES_NO} />
        </Field>
        <Field label="Acknowledgement" required>
          <label className="flex items-start gap-2.5 text-sm text-stone-800 cursor-pointer">
            <input type="checkbox" name="vanAck" defaultChecked={e?.vanAck} required className="h-4 w-4 mt-0.5 accent-stone-900" />
            I understand transportation is being coordinated by van and I need to be on time for pickup and departure.
          </label>
        </Field>
      </Section>

      <Section title="Sleeping / house setup">
        <Field label="Are you okay sharing a room?"><RadioGroup name="shareRoom" defaultValue={e?.shareRoom} options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "depends", label: "Depends who with" },
        ]} /></Field>
        <Field label="Are you okay sharing a bed?"><RadioGroup name="shareBed" defaultValue={e?.shareBed} options={YES_NO} /></Field>
        <Field label="Do you need your own bed?"><RadioGroup name="needOwnBed" defaultValue={e?.needOwnBed} options={YES_NO} /></Field>
        <Field label="Are you bringing any of the following?">
          <CheckboxGroup name="bringingItems" defaultValue={e?.bringingItems} options={[
            { value: "Pillow", label: "Pillow" },
            { value: "Blanket", label: "Blanket" },
            { value: "Towel", label: "Towel" },
            { value: "Sleeping bag", label: "Sleeping bag" },
            { value: "Air mattress", label: "Air mattress" },
            { value: "None of the above", label: "None of the above" },
          ]} />
        </Field>
        <Field label="Anything we should know about your sleep situation?" hint="Snoring, light sleeper, CPAP, early riser, needs quiet, etc.">
          <TextArea name="sleepNotes" defaultValue={e?.sleepNotes} />
        </Field>
      </Section>

      <Section title="Food / allergies" intro="I'll be buying groceries and planning meals, so list everything clearly.">
        <Field label="Do you have any food allergies?"><RadioGroup name="hasAllergies" defaultValue={e?.hasAllergies} options={YES_NO} /></Field>
        <Field label="If yes, list them here"><TextArea name="allergiesList" defaultValue={e?.allergiesList} /></Field>
        <Field label="How serious is the allergy?">
          <RadioGroup name="allergySeverity" defaultValue={e?.allergySeverity} options={[
            { value: "mild", label: "Mild" },
            { value: "serious", label: "Serious" },
            { value: "cross-contamination", label: "Cross-contamination issue" },
            { value: "airborne", label: "Airborne allergy" },
            { value: "epipen", label: "EpiPen needed" },
            { value: "n/a", label: "Not applicable" },
          ]} />
        </Field>
        <Field label="Do you have any dietary restrictions?">
          <CheckboxGroup name="dietaryRestrictions" defaultValue={e?.dietaryRestrictions} options={[
            { value: "Vegetarian", label: "Vegetarian" },
            { value: "Vegan", label: "Vegan" },
            { value: "Gluten-free", label: "Gluten-free" },
            { value: "Dairy-free", label: "Dairy-free" },
            { value: "Kosher", label: "Kosher" },
            { value: "Halal", label: "Halal" },
            { value: "No pork", label: "No pork" },
            { value: "No red meat", label: "No red meat" },
            { value: "None", label: "None" },
          ]} />
          <div className="mt-2"><TextInput name="dietaryOther" defaultValue={e?.dietaryOther} placeholder="Other" /></div>
        </Field>
        <Field label="Foods you absolutely will not eat"><TextArea name="willNotEat" defaultValue={e?.willNotEat} rows={2} /></Field>
        <Field label="Foods you actually like"><TextArea name="likedFoods" defaultValue={e?.likedFoods} rows={2} /></Field>
        <Field label="Snack requests"><TextArea name="snackRequests" defaultValue={e?.snackRequests} rows={2} /></Field>
        <Field label="Drink preferences">
          <CheckboxGroup name="drinkPrefs" defaultValue={e?.drinkPrefs} options={[
            { value: "Coffee", label: "Coffee" },
            { value: "Tea", label: "Tea" },
            { value: "Seltzer", label: "Seltzer" },
            { value: "Soda", label: "Soda" },
            { value: "Juice", label: "Juice" },
            { value: "Energy drinks", label: "Energy drinks" },
            { value: "Water", label: "Water" },
          ]} />
          <div className="mt-2"><TextInput name="drinkOther" defaultValue={e?.drinkOther} placeholder="Other" /></div>
        </Field>
        <Field label="Are you okay with communal meals?">
          <RadioGroup name="communalMeals" defaultValue={e?.communalMeals} options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "some", label: "Some meals only" },
          ]} />
        </Field>
        <Field label="Are you willing to help cook or clean?">
          <RadioGroup name="helpCookClean" defaultValue={e?.helpCookClean} options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "cleanOnly", label: "I can help clean but not cook" },
            { value: "cookOnly", label: "I can help cook but not clean" },
          ]} />
        </Field>
      </Section>

      <Section title="Medical / safety" intro="Only share what would be useful in an emergency or for planning the house.">
        <Field label="Any medical conditions we should know about in case of emergency?">
          <TextArea name="medicalConditions" defaultValue={e?.medicalConditions} />
        </Field>
        <Field label="Any medications that need refrigeration?"><RadioGroup name="refrigeratedMeds" defaultValue={e?.refrigeratedMeds} options={YES_NO} /></Field>
        <Field label="Do you carry an EpiPen, inhaler, or other emergency medical item?">
          <RadioGroup name="emergencyMedItem" defaultValue={e?.emergencyMedItem} options={YES_NO} />
        </Field>
        <Field label="Any mobility or accessibility needs?"><TextArea name="mobilityNeeds" defaultValue={e?.mobilityNeeds} rows={2} /></Field>
        <Field label="Anything you cannot or should not do?" hint="Hiking, swimming, drinking, late nights, stairs, etc.">
          <TextArea name="cannotDo" defaultValue={e?.cannotDo} rows={2} />
        </Field>
        <Field label="Anything that would make the weekend safer, easier, or less annoying for you?">
          <TextArea name="safetyNotes" defaultValue={e?.safetyNotes} />
        </Field>
      </Section>

      <Section title="Comedy / workshop info" intro="This is a comedy summer camp, so we'll be writing, workshopping, performing, and doing group creative activities.">
        <Field label="What are you hoping to work on?">
          <CheckboxGroup name="workOnGoals" defaultValue={e?.workOnGoals} options={[
            { value: "New jokes", label: "New jokes" },
            { value: "Existing set", label: "Existing set" },
            { value: "Longer set", label: "Longer set" },
            { value: "Crowd work", label: "Crowd work" },
            { value: "Characters", label: "Characters" },
            { value: "Sketches", label: "Sketches" },
            { value: "Roast jokes", label: "Roast jokes" },
            { value: "Social media ideas", label: "Social media ideas" },
            { value: "Podcast ideas", label: "Podcast ideas" },
            { value: "Writing discipline", label: "Writing discipline" },
          ]} />
          <div className="mt-2"><TextInput name="workOnOther" defaultValue={e?.workOnOther} placeholder="Other" /></div>
        </Field>
        <Field label="How much material do you want to workshop?">
          <RadioGroup name="materialAmount" defaultValue={e?.materialAmount} options={[
            { value: "premises", label: "A few premises" },
            { value: "3-5", label: "3–5 minutes" },
            { value: "5-10", label: "5–10 minutes" },
            { value: "fullSet", label: "A full set" },
            { value: "unsure", label: "Not sure yet" },
          ]} />
        </Field>
        <Field label="Are you comfortable performing in front of the group?">
          <RadioGroup name="comfortPerforming" defaultValue={e?.comfortPerforming} options={YES_NO_DEPENDS} />
        </Field>
        <Field label="Are you comfortable receiving feedback from the group?">
          <RadioGroup name="comfortReceivingFb" defaultValue={e?.comfortReceivingFb} options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "certainPeople", label: "Only from certain people" },
            { value: "ifAsked", label: "Only if I ask for it" },
          ]} />
        </Field>
        <Field label="Are you comfortable giving feedback to others?">
          <RadioGroup name="comfortGivingFb" defaultValue={e?.comfortGivingFb} options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "casually", label: "Only casually" },
          ]} />
        </Field>
        <Field label="Is there anything you do not want feedback on?"><TextArea name="feedbackOptOut" defaultValue={e?.feedbackOptOut} rows={2} /></Field>
        <Field label="What kind of feedback is actually useful to you?" hint="Tags, structure, honesty, punch-up, performance notes, premise clarity, etc.">
          <TextArea name="usefulFeedback" defaultValue={e?.usefulFeedback} />
        </Field>
      </Section>

      <Section title="Content / social media" intro="We'll be making content for social media during the weekend. This may include group videos, photos, sketches, recap clips, behind-the-scenes footage, and other planned content.">
        <Field label="Instagram handle"><TextInput name="instagram" defaultValue={e?.instagram} placeholder="@handle" /></Field>
        <Field label="TikTok handle"><TextInput name="tiktok" defaultValue={e?.tiktok} placeholder="@handle" /></Field>
        <Field label="Any other handle you want promoted"><TextInput name="otherHandles" defaultValue={e?.otherHandles} /></Field>
        <Field label="Are you comfortable appearing in group photos?"><RadioGroup name="comfortGroupPhotos" defaultValue={e?.comfortGroupPhotos} options={YES_NO_ASK} /></Field>
        <Field label="Are you comfortable appearing in group videos?"><RadioGroup name="comfortGroupVideos" defaultValue={e?.comfortGroupVideos} options={YES_NO_ASK} /></Field>
        <Field label="Are you comfortable being tagged on social media?"><RadioGroup name="comfortTagged" defaultValue={e?.comfortTagged} options={YES_NO_ASK} /></Field>
        <Field label="Are you comfortable being part of planned group content?">
          <RadioGroup name="comfortPlannedContent" defaultValue={e?.comfortPlannedContent} options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "depends", label: "Depends on the idea" },
          ]} />
        </Field>
        <Field label="Content comfort level">
          <RadioGroup name="contentComfort" defaultValue={e?.contentComfort} options={[
            { value: "asMuch", label: "Film me as much as possible" },
            { value: "groupOnly", label: "I'm okay being in group content, but don't make me the focus" },
            { value: "askFirst", label: "Ask me before filming me directly" },
            { value: "plannedOnly", label: "I only want to be in planned/group photos" },
            { value: "doNot", label: "Do not film or photograph me" },
          ]} />
        </Field>
        <Field label="Are there any types of content you do not want to be part of?" hint="Drinking content, swimsuit content, dating/sex jokes, prank content, anything messy, etc.">
          <TextArea name="contentOptOut" defaultValue={e?.contentOptOut} />
        </Field>
        <Field label="Do you want to approve clips before they are posted?">
          <RadioGroup name="approveClipsBeforePost" defaultValue={e?.approveClipsBeforePost} options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "ifMain", label: "Only if I'm the main focus" },
          ]} />
        </Field>
        <Field label="Content acknowledgements">
          <CheckboxGroup name="contentAcks" defaultValue={e?.contentAcks} options={[
            { value: "filmed", label: "I am okay being filmed during group activities." },
            { value: "photographed", label: "I am okay being photographed during group activities." },
            { value: "recap", label: "I am okay appearing in recap videos from the weekend." },
            { value: "promo", label: "I am okay appearing in promotional content for future Comedy Summer Camp weekends." },
            { value: "tagged", label: "I am okay being tagged in posts." },
            { value: "approveClips", label: "I want to approve clips before they are posted." },
            { value: "doNotFilm", label: "I do not want to be filmed or photographed." },
          ]} />
        </Field>
      </Section>

      <Section title="Joke / material protection" intro="This part matters. People can make content together without stealing or posting unfinished jokes. All five required.">
        <Field label="" required>
          <CheckboxGroup name="jokeProtectionAcks" defaultValue={e?.jokeProtectionAcks} options={[
            { value: "noPostMaterial", label: "No one may post my stand-up material without my permission." },
            { value: "workshopPrivate", label: "Workshop footage is private unless I approve it being posted." },
            { value: "groupOk", label: "Group/social content is okay, but my actual jokes should not be posted without approval." },
            { value: "noRepeat", label: "I understand other comics' jokes, premises, unfinished ideas, and personal stories should not be repeated, posted, or used without permission." },
            { value: "noPost", label: "I will not post another comic's material without asking them first." },
          ]} />
        </Field>
      </Section>

      <Section title="Group activities" intro="Comedy-related group activities, content creation, writing sessions, workshops, and regular summer camp-style activities.">
        <Field label="Which activities are you interested in?">
          <CheckboxGroup name="activitiesInterested" defaultValue={e?.activitiesInterested} options={[
            { value: "Joke writing sessions", label: "Joke writing sessions" },
            { value: "Set workshop", label: "Set workshop" },
            { value: "Mock comedy show", label: "Mock comedy show" },
            { value: "Roast games", label: "Roast games" },
            { value: "Group sketches", label: "Group sketches" },
            { value: "Social media content", label: "Social media content" },
            { value: "Podcast-style recordings", label: "Podcast-style recordings" },
            { value: "Campfire hang", label: "Campfire hang" },
            { value: "Board/card games", label: "Board/card games" },
            { value: "Swimming", label: "Swimming" },
            { value: "Hiking/walks", label: "Hiking/walks" },
            { value: "Cooking together", label: "Cooking together" },
            { value: "Quiet writing time", label: "Quiet writing time" },
          ]} />
          <div className="mt-2"><TextInput name="activitiesOtherText" defaultValue={e?.activitiesOtherText} placeholder="Other" /></div>
        </Field>
        <Field label="Any activities you do not want to do?"><TextArea name="activitiesOptOut" defaultValue={e?.activitiesOptOut} rows={2} /></Field>
        <Field label="Are you okay with structured activities, or do you prefer more free time?">
          <RadioGroup name="structurePref" defaultValue={e?.structurePref} options={[
            { value: "structure", label: "I like structure" },
            { value: "mix", label: "I want a mix" },
            { value: "freeTime", label: "I prefer mostly free time" },
          ]} />
        </Field>
      </Section>

      <Section title="Payment / costs">
        <Field label="Preferred payment method">
          <RadioGroup name="paymentMethod" defaultValue={e?.paymentMethod} options={[
            { value: "Venmo", label: "Venmo" },
            { value: "Zelle", label: "Zelle" },
            { value: "Cash App", label: "Cash App" },
            { value: "PayPal", label: "PayPal" },
            { value: "Other", label: "Other" },
          ]} />
          <div className="mt-2"><TextInput name="paymentMethodOther" defaultValue={e?.paymentMethodOther} placeholder="If other, specify" /></div>
        </Field>
        <Field label="Payment username / info"><TextInput name="paymentUsername" defaultValue={e?.paymentUsername} /></Field>
        <Field label="Payment acknowledgements">
          <CheckboxGroup name="paymentAcks" defaultValue={e?.paymentAcks} options={[
            { value: "costs", label: "I understand costs may include the house, vans, food, supplies, and shared activity expenses." },
            { value: "finalCost", label: "I understand the final cost may depend on the number of people attending." },
            { value: "nonRefund", label: "I understand that once the house and vans are booked, my spot may not be refundable unless someone replaces me." },
            { value: "deadlines", label: "I understand payment deadlines need to be followed so one person is not fronting everyone's money." },
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
        <Field label="Anything else we should know before planning the weekend?"><TextArea name="finalNotes" defaultValue={e?.finalNotes} /></Field>
        <Field label="What would make this weekend actually fun for you?"><TextArea name="whatWouldMakeFun" defaultValue={e?.whatWouldMakeFun} /></Field>
      </Section>

      <div className="border-t border-stone-200 mt-10 pt-6 flex items-center justify-between">
        <p className="text-xs text-stone-500">Required fields marked with <span className="text-red-600">*</span>.</p>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {submitting ? "Saving…" : existing ? "Update form" : "Submit form"}
        </button>
      </div>
    </form>
  );
}
