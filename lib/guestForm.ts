/**
 * The guest form's fields in one place: what the server will accept, what is
 * required, which trip switch each question depends on, and the label the trip
 * owner reads back. The form component, the save action and the owner's
 * answers page all read this, so they can't drift apart.
 */

/** The no-alcohol / no-drugs / no-smoking checks, in the order the form asks them. */
export const SUBSTANCE_RULES = [
  { key: "alcohol", field: "noAlcoholAck", label: "No alcohol. I won't bring, drink, or share alcohol on the trip." },
  { key: "drugs", field: "noDrugsAck", label: "No drugs. I won't bring, use, or share recreational drugs on the trip." },
  { key: "smoking", field: "noSmokingAck", label: "No smoking. I won't smoke or vape anything (tobacco, cannabis, or otherwise) on the trip." },
] as const;

/** Guest-form switches a trip owner can turn off (stored in Trip.disabledSections). */
export const GUEST_FORM_TOGGLES = [
  { key: "alcohol", label: "No alcohol" },
  { key: "drugs", label: "No drugs" },
  { key: "smoking", label: "No smoking / vaping" },
  { key: "age21", label: "21+ only" },
  { key: "material", label: "Creative material protection" },
  { key: "social", label: "Social media & content" },
] as const;

type Kind = "string" | "array" | "bool";

export type GuestField = {
  name: string;
  kind: Kind;
  label: string;
  /** Required to submit. For arrays: the values that must all be checked. */
  required?: boolean | readonly string[];
  /** Trip section / switch this question depends on. Off → not asked. */
  when?: string;
};

export const HOUSE_RULES = [
  { value: "shared", label: "I understand this is a shared house and I'm expected to clean up after myself." },
  { value: "food", label: "I understand food is being planned in advance and I need to list allergies and dietary restrictions honestly.", when: "meals" },
  { value: "noStealing", label: "I understand I should not eat food that is clearly set aside for someone else." },
  { value: "quietHours", label: "I understand quiet hours may exist." },
  { value: "damage", label: "I understand I am responsible for damage I personally cause." },
  { value: "respect", label: "I understand I need to respect people's space, sleep, food needs, creative work, and boundaries." },
  { value: "groupTrip", label: "I understand this is a group trip, not a hotel, and everyone needs to help keep the house functional." },
] as const;

export function activeHouseRules(off: readonly string[]) {
  return HOUSE_RULES.filter((r) => !("when" in r) || !off.includes(r.when));
}

export const MATERIAL_ACKS = ["noPostMaterial", "workshopPrivate", "groupOk", "noRepeat", "noPost"] as const;
export const DEPOSIT_ACKS = ["payDeposit", "returned", "forfeitAndCharged", "hostNotLiable"] as const;

export const INTAKE_FIELDS: readonly GuestField[] = [
  { name: "fullName", kind: "string", label: "Full name", required: true },
  { name: "stageName", kind: "string", label: "Stage / display name", required: true },
  { name: "phoneNumber", kind: "string", label: "Phone number", required: true },
  { name: "pronouns", kind: "string", label: "Pronouns", required: true },
  { name: "age21Confirmed", kind: "bool", label: "Confirmed 21 or older", required: true, when: "age21" },
  { name: "maxBudget", kind: "string", label: "Max trip share", required: true, when: "payment" },
  { name: "noAlcoholAck", kind: "bool", label: "Agreed: no alcohol", required: true, when: "alcohol" },
  { name: "noDrugsAck", kind: "bool", label: "Agreed: no drugs", required: true, when: "drugs" },
  { name: "noSmokingAck", kind: "bool", label: "Agreed: no smoking / vaping", required: true, when: "smoking" },
  { name: "shareBed", kind: "string", label: "OK sharing a bed", required: true, when: "sleeping" },
  { name: "medicalConditions", kind: "string", label: "Medical conditions", required: true },
  { name: "refrigeratedMeds", kind: "string", label: "Refrigerated medications", required: true },
  { name: "emergencyMedItem", kind: "string", label: "Carries emergency medical item", required: true },
  { name: "mobilityNeeds", kind: "string", label: "Mobility / accessibility needs", required: true },
  { name: "cannotDo", kind: "string", label: "Can't or shouldn't do", required: true },
  { name: "safetyNotes", kind: "string", label: "Would make the trip safer / easier", required: true },
  { name: "instagram", kind: "string", label: "Instagram", required: true, when: "social" },
  { name: "tiktok", kind: "string", label: "TikTok", required: true, when: "social" },
  { name: "otherHandles", kind: "string", label: "Other handles", required: true, when: "social" },
  { name: "comfortGroupPhotos", kind: "string", label: "OK in group photos", required: true, when: "social" },
  { name: "comfortGroupVideos", kind: "string", label: "OK in group videos", required: true, when: "social" },
  { name: "comfortTagged", kind: "string", label: "OK being tagged", required: true, when: "social" },
  { name: "comfortPlannedContent", kind: "string", label: "OK in planned content", required: true, when: "social" },
  { name: "contentAcks", kind: "array", label: "Content acknowledgements", when: "social" },
  { name: "jokeProtectionAcks", kind: "array", label: "Material protection", required: MATERIAL_ACKS, when: "material" },
  { name: "activitiesInterested", kind: "array", label: "Interested in", when: "itinerary" },
  { name: "activitiesOtherText", kind: "string", label: "Other activities", required: true, when: "itinerary" },
  { name: "activitiesOptOut", kind: "string", label: "Won't do", required: true, when: "itinerary" },
  { name: "structurePref", kind: "string", label: "Structure preference", required: true, when: "itinerary" },
  { name: "securityDepositAcks", kind: "array", label: "Security deposit terms", required: DEPOSIT_ACKS, when: "payment" },
  { name: "houseRulesAcks", kind: "array", label: "House rules" },
  { name: "finalNotes", kind: "string", label: "Anything else", required: true },
  { name: "whatWouldMakeFun", kind: "string", label: "What would make it fun", required: true },
];

/** Preference answers, for the owner's read-only view (the save path lives in the action). */
export const PREFERENCE_FIELDS: readonly GuestField[] = [
  { name: "emergencyName", kind: "string", label: "Emergency contact" },
  { name: "emergencyPhone", kind: "string", label: "Emergency phone" },
  { name: "comingFrom", kind: "string", label: "Coming from", when: "transport" },
  { name: "centralPickup", kind: "string", label: "Central pickup", when: "transport" },
  { name: "preferredArea", kind: "string", label: "Preferred pickup area", when: "transport" },
  { name: "preferredAreaOther", kind: "string", label: "Other area", when: "transport" },
  { name: "carsick", kind: "string", label: "Gets carsick", when: "transport" },
  { name: "needsFrontSeat", kind: "string", label: "Needs front seat", when: "transport" },
  { name: "luggageSize", kind: "string", label: "Luggage", when: "transport" },
  { name: "bulkyItems", kind: "string", label: "Bulky items", when: "transport" },
  { name: "willingToDrive", kind: "string", label: "Willing to drive", when: "transport" },
  { name: "hasAllergies", kind: "string", label: "Has allergies", when: "meals" },
  { name: "allergiesList", kind: "string", label: "Allergies", when: "meals" },
  { name: "allergySeverity", kind: "string", label: "Allergy severity", when: "meals" },
  { name: "dietaryRestrictions", kind: "array", label: "Dietary restrictions", when: "meals" },
  { name: "dietaryOther", kind: "string", label: "Other dietary", when: "meals" },
  { name: "willNotEat", kind: "string", label: "Won't eat", when: "meals" },
  { name: "likedFoods", kind: "string", label: "Likes", when: "meals" },
  { name: "snackRequests", kind: "string", label: "Snack requests", when: "meals" },
  { name: "drinkPrefs", kind: "array", label: "Drinks", when: "meals" },
  { name: "drinkOther", kind: "string", label: "Other drinks", when: "meals" },
  { name: "communalMeals", kind: "string", label: "OK with communal meals", when: "meals" },
  { name: "helpCookClean", kind: "string", label: "Will help cook / clean", when: "meals" },
  { name: "workOnOther", kind: "string", label: "Wants to work on", when: "itinerary" },
];

export function activeFields(fields: readonly GuestField[], off: readonly string[]): GuestField[] {
  return fields.filter((f) => !f.when || !off.includes(f.when));
}

type Values = Record<string, string | string[] | boolean | null>;

/**
 * Read only the guest-form fields this trip asks for out of submitted form
 * data. Anything else in the request (ids, lock flags, other users' ids) is
 * ignored, and questions the trip doesn't ask are left untouched.
 */
export function readIntake(formData: FormData, off: readonly string[]): Values {
  const data: Values = {};
  for (const f of activeFields(INTAKE_FIELDS, off)) {
    if (f.kind === "array") {
      const raw = [...formData.getAll(`${f.name}[]`), ...formData.getAll(f.name)];
      data[f.name] = raw.map((v) => v.toString().trim()).filter(Boolean);
    } else if (f.kind === "bool") {
      const v = formData.get(f.name);
      data[f.name] = v === "on" || v === "true";
    } else {
      data[f.name] = (formData.get(f.name) as string | null)?.toString().trim() || null;
    }
  }
  return data;
}

/** The first problem with a submission, or null when it's complete. */
export function intakeError(data: Values, off: readonly string[]): string | null {
  for (const f of activeFields(INTAKE_FIELDS, off)) {
    const v = data[f.name];
    if (f.name === "houseRulesAcks") {
      const checked = (v as string[]) ?? [];
      if (!activeHouseRules(off).every((r) => checked.includes(r.value))) return "Please agree to all house rules.";
      continue;
    }
    if (!f.required) continue;
    if (Array.isArray(f.required)) {
      const checked = (v as string[]) ?? [];
      if (!f.required.every((r) => checked.includes(r))) return `Please agree to every item under "${f.label}".`;
    } else if (!v) {
      return f.kind === "bool" ? `Please confirm: ${f.label}.` : `Please answer "${f.label}" — use "N/A" if it doesn't apply.`;
    }
  }
  return null;
}

/** Format a stored answer for reading. */
export function formatAnswer(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  return String(v);
}
