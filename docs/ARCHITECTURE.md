# Architecture

How The Trip Handler is put together, and why. This is the document to read
before changing anything structural.

---

## The shape of the thing

One Next.js 16 App Router application, deployed as a single Vercel project,
talking to one Postgres database through Prisma. There is no separate API
service and no client-side data layer — no REST controllers, no tRPC, no React
Query.

```
Browser
  │
  │  GET  →  React Server Component renders on the server,
  │          queries Postgres directly, streams HTML
  │
  │  POST →  Server Action (a "use server" function referenced
  │          by a <form action> or called from a client component)
  │          ↓
  │      authorization guard → Prisma write → revalidatePath()
  │          ↓
  │      the affected route re-renders and streams down
  ▼
Postgres  ← Prisma Client
```

Two things escape that loop, and both do so deliberately:

- **`/api/webhooks/stripe`** is a route handler, not an action, because Stripe
  is the caller and it needs a stable public URL and raw-body signature
  verification.
- **NextAuth** owns `/api/auth/*`.

Everything else — every mutation in the app, 80-odd of them — is a server
action.

### Why no API layer

The app has exactly one client: its own UI. An HTTP API in the middle would buy
nothing and cost a serialization boundary, a second set of types, and a second
set of authorization checks to keep in sync with the first. Server actions
collapse that: the mutation is a typed function, the form posts to it directly,
and there is one place where authorization lives.

The trade-off is real and worth stating. If this app ever needs a mobile client
or a public API, that layer has to be built, and the actions would become its
implementation rather than its interface. That is a deliberate bet that it
won't, made in exchange for a much smaller codebase today.

---

## Data model

Everything hangs off `Trip`. A `User` has an optional `tripId` (the trip they
are a participant of) and a list of `ownedTrips` (the trips they created). That
single distinction is the whole permission model:

| Relation | Meaning | Grants |
|---|---|---|
| `Trip.ownerId == user.id` | You created this trip | Organizer powers: pricing, approvals, itinerary, bed inventory, meal finalization |
| `User.tripId == trip.id` **and** an approved status | You are on this trip | Member powers: claim a bed, vote, post, contribute, expense, pay |

There is no roles table and no permission strings. The `Role` enum exists but
carries one meaningful value in practice — `ADMIN` is a legacy seat that the
actions explicitly exclude from participant behaviour rather than elevate.
Ownership is derived from data, not assigned.

### Status is a state machine

`User.status` drives what a member can see and do:

```
PENDING ──approve──> APPROVED ──trip locks──> PENDING_PAYMENT ──Stripe──> CONFIRMED_PAID
   │                                                                            
   └──reject──> (rejectedTripId set, cannot re-apply to that trip)
   
any ──withdraw/remove──> CANCELLED
```

`lib/approval.ts` collapses the three post-approval states into one predicate,
because "may this person act on the trip?" is true for all of them:

```ts
export function isApproved(status) {
  return status === "APPROVED" || status === "PENDING_PAYMENT" || status === "CONFIRMED_PAID";
}
```

Adding a state later means changing that function, not auditing 80 call sites.

### The child records

`MealSlot`, `Day`/`ItineraryItem`, `Bed`, `Contribution`, `Expense`, `Comment`,
`PageNote` and `GuestForm` all carry a `tripId` or reach one in a single hop.
That matters for authorization: every guard can answer "does this row belong to
the trip this caller is on?" without a recursive walk.

---

## Authorization

**Every server action re-reads the caller from the database.** This is the
single most important rule in the codebase.

The NextAuth session is a JWT (`lib/auth.ts`, `session.strategy = "jwt"`) and it
carries `status`. A JWT is a snapshot: after an organizer approves someone, that
person's token still says `PENDING` until they sign in again. So the token's
`status` is used for **rendering only** — deciding which nav items to show — and
never for deciding whether a write is allowed.

That rule lives in one place, `lib/authz.ts`:

```ts
export async function requireApprovedMemberOf(tripId: string | null | undefined) {
  const member = await requireApprovedMember();   // ← re-reads status + tripId from Postgres
  if (isAuthzError(member)) return member;
  if (!tripId || member.tripId !== tripId) return { error: "That isn't on your trip." };
  return member;
}
```

Three checks, in order: authenticated, approved *right now*, and on *this*
trip. Both of the last two are easy to get wrong, and this codebase got both
wrong before they were consolidated:

- `claimBedSlot` read `status` from the session. A member who had been
  cancelled or removed still held a token saying `APPROVED`, and the action
  honoured it.
- `claimBedSlot` and `bumpFromSingle` checked "is this caller approved?"
  without checking "approved *on this trip*". The bed id comes from the
  caller, so an approved member of trip A could claim a bed on trip B.
  `requestBedmate`, three functions away, did check — which is what makes it
  an oversight rather than a design decision.

The board had a third variant of the same mistake, on a read path: `Comment`
carried no `tripId` at all and the query had no filter, so every approved member
of every trip saw one shared stream. Adding the column took a three-step
migration — nullable, backfill from each author's trip, then required — because
the table already had rows.

`tests/member-authz.test.ts` drives the real actions and asserts nothing is
written. Against the pre-fix code those tests return `{ success: true }`.

### Reads are gated the same way

Page-level gates used to call `isApproved(session.user.status)` — the same stale
snapshot, one layer up. `lib/approval.ts#getUserStatus` now reads the row, so a
revoked approval closes the page on the next request rather than at token
expiry. One query per gated render, which is the right trade for a correct
answer.

### Actions are public endpoints

A `"use server"` export is a network endpoint whether or not any UI calls it.
Next generates an id for it and will invoke it for anyone who can produce that
id. Two of the setup helpers in this codebase — `ensureMealPlanSetup` and a
sleeping-arrangement equivalent — were originally written as "internal" helpers
invoked during render, with no guard, on exactly that mistaken assumption. They
now carry guards like every other action.

The rule this codebase holds to: **if it is exported from a `"use server"`
file, it authorizes.** The one intentional exception is `signupAction`, which is
public by definition.

### Money is never client-controlled

`createCheckoutSession` (`app/actions/payments.ts`) takes no arguments. The
amount is derived server-side from the trip's locked `finalPrice` plus a
constant deposit. The client cannot propose a price, and the client cannot mark
itself paid — only the signed Stripe webhook flips `CONFIRMED_PAID`. The
`success_url` redirect is cosmetic; a user who navigates to it directly gets a
page that still says unpaid.

---

## Concurrency

Two places in the app can be raced by ordinary use, and both are handled with a
conditional write rather than a read-then-write.

**Trip finalization** (`app/actions/trips.ts:348`). Locking the third cost line
computes the per-person share, locks the trip, moves everyone to
`PENDING_PAYMENT`, and emails them. A double-click would do all of that twice.
The fix is to make the claim atomic and act only on the winner:

```ts
const claim = await prisma.trip.updateMany({
  where: { id: tripId, isLocked: false },   // ← the guard is in the WHERE
  data: { finalPrice: share, isLocked: true, lockedAt: new Date() },
});
if (claim.count > 0) { /* only the winning call emails and re-statuses */ }
```

**Bed claims** (`app/actions/sleeping.ts`). Counting the occupants and then
inserting is a race: two members tapping the same last slot both read "one
free" and both insert, putting three people in a double. The `userId @unique`
constraint doesn't help — it stops one person being in two beds, not two people
overfilling one. So the count and the insert happen inside a single
serializable transaction, and the loser gets "that bed is already full":

```ts
await prisma.$transaction(async (tx) => {
  const taken = await tx.bedAssignment.count({ where: { bedId } });
  if (taken >= capacity) throw new BedFullError();
  await tx.bedAssignment.deleteMany({ where: { userId: auth.id } });
  await tx.bedAssignment.create({ data: { bedId, userId: auth.id } });
}, { isolationLevel: "Serializable" });
```

Leaving the previous bed is inside the same transaction, so a failure can never
strand someone with no bed at all. `P2034` (serialization failure) is caught
alongside `P2002` and reported the same way, because to the person tapping,
both mean someone else got there first.

---

## Rendering

64 components; 30 of them are client components. The default is a server
component, and `"use client"` is added only where an interaction genuinely needs
it: optimistic state, a controlled input, a disclosure, a dialog.

Two constraints have bitten this codebase and are worth knowing before you edit:

1. **A `"use server"` module may export only async functions.** Export a
   constant from one and Next rejects the entire module — not at build time, at
   *call* time. The page renders 200 and every action on it 500s. `next build`
   exits 0. This actually happened (`REACTION_EMOJIS` used to live in
   `app/actions/board.ts`); shared constants now live in `lib/`, and
   `tests/e2e/flows.spec.ts` invokes real actions specifically so this class of
   bug cannot pass CI again.

2. **Don't put non-deterministic values in a `useState` initializer.** It runs
   on the server during SSR and again on the client during hydration, and the
   two results won't match. Randomized copy is picked in a server component and
   passed down as a prop.

---

## Testing

Three suites, each answering a question the others cannot.

| Suite | Runs | Answers |
|---|---|---|
| `tests/*.test.ts` (Vitest) | Pure functions, no DB | Is the pricing math, the approval predicate, the nav routing correct? |
| `tests/e2e/responsive.spec.ts` | 5 viewports, real build | Does the layout hold and are the controls thumb-sized? |
| `tests/e2e/flows.spec.ts` | 1 viewport, real build | Do the mutations actually work end to end? |
| `tests/e2e/a11y.spec.ts` | 1 viewport, real build | Does every page pass WCAG 2.1 AA's automatable rules? |

`tests/member-authz.test.ts` and `tests/owner-authz.test.ts` are worth calling
out separately: they drive real server actions against a mocked Prisma and
assert that an unauthorized call writes *nothing*. A test that only asserts the
error message would still pass if the action returned an error after mutating.

The responsive suite uses Playwright *device descriptors*, not bare viewport
sizes, because the app keys its touch sizing off `@media (pointer: coarse)`
rather than a width breakpoint — a 768px iPad is a touch device and a 768px
browser window is not. A viewport-only override would silently exercise the
desktop styles at a phone width and pass while the real thing was broken.

CI runs against a real Postgres 16 service and applies the committed migrations,
so schema drift and a migration that doesn't apply cleanly both fail the build
rather than surfacing on deploy.

---

## What is deliberately not here

- **No test for Safari.** The e2e suite is Chromium-only to keep CI to one
  browser download. Safari-specific rendering stays a manual check, and this is
  named rather than papered over.
- **No background job runner.** Emails send inline in the action that triggers
  them. At this scale that is correct; at ten times the traffic it would need a
  queue.
- **No multi-tenant isolation at the database level.** Isolation is enforced in
  the guards, not by row-level security. That is the standard trade-off for an
  app this size, and the reason the "is this row on your trip?" check appears in
  every guard.
