export const SLOT_DEFS = [
  { day: "Friday", meal: "Dinner", optional: false, order: 0 },
  { day: "Saturday", meal: "Breakfast", optional: false, order: 1 },
  { day: "Saturday", meal: "Lunch", optional: false, order: 2 },
  { day: "Saturday", meal: "Dinner", optional: false, order: 3 },
  { day: "Sunday", meal: "Breakfast", optional: false, order: 4 },
  { day: "Sunday", meal: "Lunch", optional: false, order: 5 },
  { day: "Sunday", meal: "Dinner", optional: false, order: 6 },
  { day: "Monday", meal: "Breakfast", optional: false, order: 7 },
  { day: "Monday", meal: "Travel Snacks / Leftovers", optional: true, order: 8 },
] as const;

export type Phase = "suggestions_open" | "voting_open" | "admin_finalizing" | "finalized";
