export const PAGE_NOTE_KEYS = [
  { key: "dashboard", label: "Dashboard home" },
  { key: "board", label: "Board" },
  { key: "contributions", label: "Contributions" },
  { key: "expenses", label: "Expenses" },
  { key: "itinerary", label: "Itinerary" },
  { key: "lodging", label: "Lodging" },
  { key: "meals", label: "Meals" },
  { key: "payment", label: "Payment" },
  { key: "preferences", label: "Preferences" },
  { key: "profile", label: "Profile" },
  { key: "roster", label: "Roster" },
  { key: "sleeping", label: "Sleeping" },
] as const;

export type PageNoteKey = (typeof PAGE_NOTE_KEYS)[number]["key"];
