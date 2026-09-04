import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * The member-side authorization boundary.
 *
 * Two rules, and both of them exist because breaking either one is easy to do
 * by accident:
 *
 * 1. **Status is read from the database, never from the session.** The
 *    NextAuth session is a JWT, and a JWT is a snapshot taken at sign-in. A
 *    member who is removed from a trip, or whose application is cancelled,
 *    keeps a token that still says APPROVED until it expires. Deciding a write
 *    on that token means honouring a permission that was revoked hours ago.
 *    The token's `status` is fine for choosing which nav links to render; it is
 *    not fine for authorizing a mutation.
 *
 * 2. **Membership of *this* trip is checked, not membership in general.** Every
 *    server action is a public endpoint that takes ids from the caller. An
 *    approved member of trip A who is only checked for "approved" can pass
 *    trip B's bed id and act on someone else's trip. The check that matters is
 *    `user.tripId === thisTripId`.
 */

const APPROVED = new Set(["APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID"]);

export type AuthzError = { error: string };

/** An approved participant, with the trip they are actually on. */
export type ApprovedMember = { id: string; tripId: string };

export function isAuthzError<T extends object>(v: T | AuthzError): v is AuthzError {
  return "error" in v;
}

/** The signed-in user's id, or null. Cheap enough to call before the DB read. */
export async function sessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  // "admin" is a legacy non-participant seat; it has no trip and no member powers.
  if (!user?.id || user.id === "admin" || user.role === "ADMIN") return null;
  return user.id;
}

/**
 * The caller must be an approved participant of some trip. Use this only for
 * actions that operate on the caller's own row (their profile, their bed) and
 * derive the trip from the record they already own.
 */
export async function requireApprovedMember(): Promise<ApprovedMember | AuthzError> {
  const userId = await sessionUserId();
  if (!userId) return { error: "Sign in as a participant first." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, tripId: true, role: true },
  });
  if (!user || user.role === "ADMIN") return { error: "Sign in as a participant first." };
  if (!user.tripId) return { error: "You're not on a trip yet." };
  if (!APPROVED.has(user.status)) return { error: "You need to be approved first." };

  return { id: userId, tripId: user.tripId };
}

/**
 * The caller must be an approved participant **of this trip**. Pass the tripId
 * read off whatever record the action is about — the bed, the meal slot, the
 * post — so the ownership of that record is what is checked, not the caller's
 * unrelated membership somewhere else.
 */
export async function requireApprovedMemberOf(
  tripId: string | null | undefined,
): Promise<ApprovedMember | AuthzError> {
  const member = await requireApprovedMember();
  if (isAuthzError(member)) return member;
  if (!tripId || member.tripId !== tripId) {
    return { error: "That isn't on your trip." };
  }
  return member;
}

/**
 * A caller who may act as a participant, or an ADMIN acting on their behalf.
 *
 * Some actions (the itinerary, the contributions board) are open to both. This
 * keeps the same rule — status comes from the database — while preserving the
 * admin escape hatch those actions already had. `tripId` is null for an admin,
 * who is not a participant of anything; callers that need a trip must read it
 * off the record they are acting on.
 */
export type ApprovedActor = { id: string; isAdmin: boolean; tripId: string | null };

export async function requireApprovedActor(): Promise<ApprovedActor | AuthzError> {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  if (!sessionUser?.id) return { error: "Sign in first." };

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { status: true, tripId: true, role: true },
  });
  // The legacy "admin" seat has no row of its own; trust the session's role
  // claim only for that case, where there is nothing in the database to read.
  if (!user) {
    if (sessionUser.role === "ADMIN") return { id: sessionUser.id, isAdmin: true, tripId: null };
    return { error: "Sign in first." };
  }

  const isAdmin = user.role === "ADMIN";
  if (!isAdmin && !APPROVED.has(user.status)) {
    return { error: "You need to be approved first." };
  }
  return { id: sessionUser.id, isAdmin, tripId: user.tripId };
}
