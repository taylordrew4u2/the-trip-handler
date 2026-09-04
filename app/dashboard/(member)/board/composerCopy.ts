/**
 * Wording for the board composer.
 *
 * This deliberately lives outside BoardClient: that file is "use client", and a
 * server component cannot call a function exported from a client module. The
 * choice is made on the server and passed down as props, so the same strings
 * appear in the streamed HTML and in the hydrating client — picking randomly
 * inside the component would run once per environment and mismatch.
 */

const PLACEHOLDERS = [
  "what's on your mind?",
  "drop a hot take",
  "share a half-formed bit",
  "spill",
  "shower thought, go",
  "say the thing you wouldn't tweet",
  "ask the group for advice",
  "loudly announce something",
];

const POST_LABELS = ["Send it", "Post it", "Drop it", "Yeet"];

/**
 * Pick the composer's wording. Called on the server so the same choice is in
 * the HTML and in the hydrating client — picking randomly inside the component
 * would run twice (once per environment) and produce a hydration mismatch.
 */
export function pickComposerCopy() {
  return {
    placeholder: PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)],
    postLabel: POST_LABELS[Math.floor(Math.random() * POST_LABELS.length)],
  };
}
