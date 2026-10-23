import { z } from "zod";
import { INTAKE_FIELDS, SUBSTANCE_RULES, activeHouseRules } from "@/lib/guestForm";

export const questionSchema = z.object({
  id: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/),
  label: z.string().trim().min(1, "Every question needs a label.").max(500),
  help: z.string().trim().max(2000).default(""),
  section: z.string().trim().min(1).max(100),
  type: z.enum(["text", "textarea", "radio", "checkbox", "checks"]),
  required: z.boolean(),
  hidden: z.boolean().default(false),
  options: z.array(z.object({ value: z.string().min(1).max(200), label: z.string().trim().min(1).max(1000) })).max(40).default([]),
  when: z.string().optional(),
});
export type IntakeQuestion = z.infer<typeof questionSchema>;
export const questionsSchema = z.array(questionSchema).min(2).max(100);
export const ESSENTIAL_QUESTIONS = ["fullName", "phoneNumber"];

const YES_NO = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];
const YES_NO_ASK = [...YES_NO, { value: "ask", label: "Ask me first" }];

export function defaultIntakeQuestions(off: readonly string[] = []): IntakeQuestion[] {
  const dep = "{deposit}";
  const optionSets: Record<string, IntakeQuestion["options"]> = {
    shareBed: YES_NO, refrigeratedMeds: YES_NO, emergencyMedItem: YES_NO,
    comfortGroupPhotos: YES_NO_ASK, comfortGroupVideos: YES_NO_ASK, comfortTagged: YES_NO_ASK,
    comfortPlannedContent: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "depends", label: "Depends on the idea" },
    ],
    contentAcks: [
      { value: "filmed", label: "I am okay being filmed during group activities." },
      { value: "photographed", label: "I am okay being photographed during group activities." },
      { value: "recap", label: "I am okay appearing in recap videos from the trip." },
      { value: "promo", label: "I am okay appearing in promotional content for future trips." },
      { value: "tagged", label: "I am okay being tagged in posts." },
      { value: "approveClips", label: "I want to approve clips before they are posted." },
      { value: "doNotFilm", label: "I do not want to be filmed or photographed." },
    ],
    jokeProtectionAcks: [
      { value: "noPostMaterial", label: "No one may post my material without my permission." },
      { value: "workshopPrivate", label: "Workshop footage is private unless I approve it being posted." },
      { value: "groupOk", label: "Group/social content is okay, but my own material should not be posted without approval." },
      { value: "noRepeat", label: "I understand other people's ideas, premises, unfinished work, and personal stories should not be repeated, posted, or used without permission." },
      { value: "noPost", label: "I will not post another person's material without asking them first." },
    ],
    activitiesInterested: [
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
    ],
    structurePref: [
      { value: "structure", label: "I like structure" },
      { value: "mix", label: "I want a mix" },
      { value: "freeTime", label: "I prefer mostly free time" },
    ],
    securityDepositAcks: [
      { value: "payDeposit", label: `I will send a ${dep} security deposit before the trip.` },
      { value: "returned", label: "I understand the deposit is returned after the trip if everyone follows the rules and there's no damage." },
      { value: "forfeitAndCharged", label: "If I break a rule or damage something, I forfeit my deposit and I'm responsible for any additional cost beyond it." },
      { value: "hostNotLiable", label: "The person whose name is on the rental is not personally liable for damage I cause — that's on me." },
    ],
    houseRulesAcks: activeHouseRules(off).map(r => ({ value: r.value, label: r.label })),
  };
  const labels: Record<string, string> = {
    stageName: "What name would you like us to use?",
    age21Confirmed: "I confirm I am 21 or older.",
    maxBudget: "What is the most you want to pay for your trip share?",
    shareBed: "Are you comfortable sharing a bed?",
    medicalConditions: "Are there any medical conditions the organizer should know about?",
    refrigeratedMeds: "Do any of your medications need refrigeration?",
    emergencyMedItem: "Do you carry an EpiPen, inhaler, or other emergency medical item?",
    mobilityNeeds: "Do you have any mobility or accessibility needs?",
    cannotDo: "Are there any activities you cannot or prefer not to do?",
    safetyNotes: "What would make the trip safer or more comfortable for you?",
    instagram: "Instagram handle", tiktok: "TikTok handle", otherHandles: "Other social media handles",
    comfortGroupPhotos: "Can you appear in group photos?", comfortGroupVideos: "Can you appear in group videos?",
    comfortTagged: "Can people tag you on social media?", comfortPlannedContent: "Would you like to join planned group content?",
    contentAcks: "Choose your photo and video preferences",
    jokeProtectionAcks: "Please agree to these creative work rules",
    activitiesInterested: "Which activities interest you?", activitiesOtherText: "Are there other activities you would enjoy?",
    activitiesOptOut: "Which activities would you prefer to skip?", structurePref: "How much planned activity would you like?",
    securityDepositAcks: "Please agree to the security deposit terms", houseRulesAcks: "Please agree to the house rules",
    finalNotes: "Is there anything else the organizer should know?", whatWouldMakeFun: "What would make this trip fun for you?",
  };
  const sections: Record<string, string> = {
    payment: "Budget and deposit", sleeping: "Sleeping", social: "Photos and social media", material: "Creative work", itinerary: "Activities",
    alcohol: "Trip rules", drugs: "Trip rules", smoking: "Trip rules", age21: "About you",
  };
  const about = ["fullName", "stageName", "phoneNumber", "pronouns"];
  return INTAKE_FIELDS.map(f => ({
    id: f.name,
    label: SUBSTANCE_RULES.find(r => r.field === f.name)?.label ?? labels[f.name] ?? f.label,
    help: f.name === "maxBudget" ? `Do not include the separate ${dep} security deposit. Example: $500 or $400–$600.`
      : f.name === "shareBed" ? "Your answer helps the organizer plan sleeping arrangements."
      : f.kind === "string" && !["fullName", "phoneNumber"].includes(f.name) && !optionSets[f.name] ? "If this does not apply, you can write N/A." : "",
    section: f.when ? sections[f.when] ?? "Trip details" : about.includes(f.name) ? "About you"
      : f.name === "houseRulesAcks" ? "House rules" : ["finalNotes", "whatWouldMakeFun"].includes(f.name) ? "Final notes" : "Safety and accessibility",
    type: f.kind === "bool" ? "checkbox" : f.kind === "array" ? "checks" : optionSets[f.name] ? "radio"
      : ["medicalConditions", "mobilityNeeds", "cannotDo", "safetyNotes", "finalNotes", "whatWouldMakeFun", "activitiesOptOut"].includes(f.name) ? "textarea" : "text",
    required: Boolean(f.required) || f.name === "houseRulesAcks",
    hidden: false,
    options: optionSets[f.name] ?? [],
    when: f.when,
  }));
}

/** A new trip's form: only the two identity questions. The organizer adds the rest. */
export function starterIntakeQuestions(): IntakeQuestion[] {
  return defaultIntakeQuestions().filter(q => ESSENTIAL_QUESTIONS.includes(q.id));
}

/** Validate editable text, stable answer IDs, and the two identity fields used by the application. */
export function validateIntakeQuestions(input: unknown): { questions: IntakeQuestion[]; error?: never } | { error: string; questions?: never } {
  const parsed = questionsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your questions." };
  const questions = parsed.data;
  if (new Set(questions.map(q => q.id)).size !== questions.length) return { error: "Question IDs must be unique." };
  const defaults = defaultIntakeQuestions();
  for (const q of questions) {
    const builtIn = defaults.find(d => d.id === q.id);
    if (!builtIn && !/^custom_[a-zA-Z0-9_]+$/.test(q.id)) return { error: "New questions must use a custom question ID." };
    if (builtIn && q.type !== builtIn.type) return { error: `Keep the answer type for ${builtIn.label}.` };
    if (q.when !== builtIn?.when) return { error: "Question section switches cannot be changed." };
    if (["radio", "checks"].includes(q.type) && !q.options.length) return { error: `Add at least one choice for ${q.label}.` };
    if (new Set(q.options.map(o => o.value)).size !== q.options.length) return { error: `Choices must have unique IDs for ${q.label}.` };
    // Built-in values are read elsewhere in the app; edit labels, not their IDs. Added choices get custom IDs.
    if (builtIn && q.options.some(o => !o.value.startsWith("custom_") && !builtIn.options.some(b => b.value === o.value))) return { error: "Keep the original choice IDs for built-in questions." };
  }
  for (const id of ESSENTIAL_QUESTIONS) {
    const q = questions.find(q => q.id === id);
    if (!q || q.hidden || !q.required) return { error: "Name and phone number must stay visible and required." };
  }
  return { questions };
}

export function intakeQuestions(config: unknown): IntakeQuestion[] {
  // The editor keeps {deposit} as a live placeholder instead of storing stale amounts.
  if (config == null) return starterIntakeQuestions();
  const parsed = validateIntakeQuestions(config);
  return parsed.questions ?? starterIntakeQuestions();
}

export function fillIntakeAmounts(questions: IntakeQuestion[], deposit = 75): IntakeQuestion[] {
  const amount = `$${deposit.toFixed(2)}`;
  return questions.map(q => ({ ...q, label: q.label.replaceAll("{deposit}", amount), help: q.help.replaceAll("{deposit}", amount),
    options: q.options.map(o => ({ ...o, label: o.label.replaceAll("{deposit}", amount) })) }));
}

export function visibleQuestions(questions: IntakeQuestion[], off: readonly string[]) {
  return questions.filter(q => !q.hidden && (!q.when || !off.includes(q.when)))
    .map(q => q.id === "houseRulesAcks" && off.includes("meals")
      ? { ...q, options: q.options.filter(o => o.value !== "food") } : q);
}

export type IntakeAnswers = Record<string, string | string[] | boolean | null>;
export function readQuestionAnswers(fd: FormData, questions: IntakeQuestion[]): { answers: IntakeAnswers; error: string | null } {
  const answers: IntakeAnswers = {};
  for (const q of questions) {
    let value: string | string[] | boolean | null;
    if (q.type === "checks") {
      value = [...fd.getAll(`${q.id}[]`), ...fd.getAll(q.id)].map(v => v.toString());
      if (value.some(v => !q.options.some(o => o.value === v))) return { answers, error: `Choose a listed answer for "${q.label}".` };
      value = [...new Set(value)];
      const agreement = ["jokeProtectionAcks", "securityDepositAcks", "houseRulesAcks"].includes(q.id);
      if (q.required && agreement && !q.options.every(o => (value as string[]).includes(o.value))) return { answers, error: `Please agree to every item under "${q.label}".` };
      if (q.required && !agreement && !value.length) return { answers, error: `Choose at least one answer for "${q.label}".` };
    } else if (q.type === "checkbox") {
      value = fd.get(q.id) === "on" || fd.get(q.id) === "true";
    } else {
      value = fd.get(q.id)?.toString().trim() || null;
      if (value && value.length > 10000) return { answers, error: `Keep "${q.label}" under 10,000 characters.` };
      if (q.type === "radio" && value && !q.options.some(o => o.value === value)) return { answers, error: `Choose a listed answer for "${q.label}".` };
    }
    if (q.required && !value) return { answers, error: `Please answer "${q.label}".` };
    answers[q.id] = value;
  }
  return { answers, error: null };
}

export type IntakeSnapshot = { questions: IntakeQuestion[]; answers: IntakeAnswers };
export function readIntakeSnapshot(input: unknown): IntakeSnapshot | null {
  const parsed = z.object({ questions: z.array(questionSchema), answers: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.boolean(), z.null()])) }).safeParse(input);
  return parsed.success ? parsed.data : null;
}
