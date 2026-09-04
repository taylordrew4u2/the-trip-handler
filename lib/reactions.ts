/**
 * The reactions a member may leave on a board post.
 *
 * This lives in a plain module rather than beside the server action that
 * validates against it: `app/actions/board.ts` is a `"use server"` file, and
 * such a module may only export async functions — exporting this array from
 * there makes Next reject the whole module at call time, which takes posting
 * and reacting down with it.
 */
export const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "💯", "🎭"] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (REACTION_EMOJIS as readonly string[]).includes(value);
}
