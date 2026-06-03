export const SLEEP_TAGS: { value: string; label: string; emoji: string }[] = [
  { value: "snorer", label: "Snorer", emoji: "😴" },
  { value: "light_sleeper", label: "Light sleeper", emoji: "🌙" },
  { value: "deep_sleeper", label: "Deep sleeper", emoji: "💤" },
  { value: "early_bird", label: "Early bird", emoji: "🌅" },
  { value: "night_owl", label: "Night owl", emoji: "🦉" },
  { value: "cold_sleeper", label: "Cold sleeper", emoji: "🥶" },
  { value: "hot_sleeper", label: "Hot sleeper", emoji: "🥵" },
];

export const SLEEP_TAG_BY_VALUE = new Map(SLEEP_TAGS.map((t) => [t.value, t]));
