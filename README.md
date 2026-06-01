# The Trip Handler

[![CI](https://github.com/taylordrew4u2/COMEDYSUMMERCAMP/actions/workflows/ci.yml/badge.svg)](https://github.com/taylordrew4u2/COMEDYSUMMERCAMP/actions/workflows/ci.yml)

A full-stack Next.js application for organizing a private group trip — applications, approvals, lodging assignment, meal planning, itinerary, expense splitting, and Stripe-collected per-person payments — built as a single-tenant SaaS-style web app.

## Live Demo

<https://comedysummercamp.vercel.app>

The deployed instance is configured for one specific trip. Admin features are hidden behind a separate sign-in page.

## Overview

**The Trip Handler** is a private web app that one trip organizer ("admin") uses to run a group trip end to end, and that every invited person uses to apply, see what's happening, claim a bed, vote on meals, sign up for contributions, and pay their share.

It is built for the friend who accidentally became the adult in charge of making the plan. Instead of juggling group chats, spreadsheets, and Venmo requests, the admin gets one place that holds:

- the application pipeline (apply → admin reviews → approve / reject)
- the cost model (housing, transport, and meals as separate line items)
- the room/bed layout and who is sleeping where
- the itinerary with comments per item
- the contribution board (who's bringing what)
- the shared expense ledger
- the meal poll and grocery plan
- Stripe checkout for each person's share + refundable deposit

Each invited person has a single dashboard that unlocks more functionality as their status moves from `PENDING` → `APPROVED` → `PENDING_PAYMENT` → `CONFIRMED_PAID`.

## Problem

Organizing a multi-day group trip with 10+ people creates a lot of repetitive coordination work:

- Collecting applications and screening who's coming.
- Splitting total costs (house rental, transit, meals) fairly when those numbers change while the trip is being planned.
- Tracking who has paid, who is still on the hook, and what each person owes including a refundable deposit.
- Assigning beds without conflicts and respecting per-bed gender rules (e.g. singles reserved for female members).
- Collecting meal preferences and producing a grocery plan.
- Keeping an itinerary that the whole group can read, comment on, and see updates to in real time.
- Sending the right transactional emails ("you're approved", "trip is locked, time to pay", "your bed was reassigned") without missing anyone.

A group chat and a spreadsheet can do any one of those things, but no one item, and they decay fast as the plan changes.

## Solution

The Trip Handler centralizes the admin's workflow and the participant's view of the trip into one authenticated web app:

- **Application + approval pipeline.** Anyone can sign up; admin reviews their guest form and approves them. Status drives what each user sees.
- **Multiple trips.** Admin can run more than one trip in the same app — create new trips, mark which one is active, control which are open for applications. Members pick which trip to apply to at signup and only see data scoped to their own trip.
- **Three-line cost model.** Admin enters housing, transport, and meals totals separately and locks each line as it becomes final. The per-person share is computed as total ÷ 10 even though the roster opens 13 spots, so the cost stays at a 10-person split while overage funds the host's effort.
- **Roster slots.** The roster is rendered as 13 fixed slots, fills top-down with approved users, and shows "Open" for the rest.
- **Bed claiming + bedmate requests.** Users claim beds. Single beds can be requested by female members and will reassign existing occupants (the bumped user gets an email and a link back to pick again).
- **Meal planning by poll.** Admin posts meal slots; users suggest options and vote; the planner moves through phases (suggestions → voting → locked → grocery).
- **Itinerary with per-item comments.** Days hold ordered itinerary items (time, title, location, description, notes, pin). Approved users can comment on each item; pending users can read but not write.
- **Contribution board.** Admin posts items to bring; users sign up to claim them.
- **Expense ledger.** Users submit shared expenses with optional receipt images; admin approves and the totals roll up.
- **Stripe checkout.** When all three cost lines are locked, the trip auto-locks, approved users move to `PENDING_PAYMENT`, and they receive an email with a Stripe Checkout link for `share + $75 deposit`. A webhook flips them to `CONFIRMED_PAID`.
- **Transactional emails.** Resend handles approval, rejection, cancellation, form-unlocked, bed-bump, trip-locked, and admin event notifications.

## Features

- Email + password authentication with NextAuth (credentials provider) and separate admin sign-in.
- Multi-trip support: admin can create, rename, switch the active trip, open/close applications per trip, and delete unused trips. Each member is bound to one trip and only sees its data.
- Per-user status machine: `PENDING`, `APPROVED`, `PENDING_PAYMENT`, `CONFIRMED_PAID`, `CANCELLED`, with UI that gates pages and emails that fire on transitions.
- Guest intake form (admin-reviewed, lockable, with an admin "unlock to edit" flow).
- Trip pricing with three line items (housing/transport/meals), independent lock-in per line, auto-solidify when all three lock, and per-person share displayed in admin and member views.
- Trip capacity of 13 roster slots with cost split as a 10-way divisor (configurable in `lib/pricing.ts`).
- Live roster with search, sort, status badges, and an admin CSV export.
- Lodging page with admin-managed description and photo gallery (Vercel Blob storage).
- Beds + bed assignments + bedmate requests with female-priority rule on singles and reassignment emails.
- Itinerary modeled as `Day → ItineraryItem` with reorder, pin, move-between-days, and an `ItineraryComment` thread per item.
- Meal planning: meal slots, member-submitted suggestions, voting, helpers, grocery list, and phase transitions.
- Contribution board for non-monetary trip contributions.
- Expense submission with receipt uploads, admin approval, and totals.
- Stripe Checkout integration plus a webhook (`/api/webhooks/stripe`) that records payments and updates user status.
- Resend-backed transactional emails for every status transition, plus admin event notifications.
- Page-level admin notes (`PageNote`) so the admin can post a sticky message at the top of any member page.
- Withdraw flow for users who decide not to attend before paying.
- Admin diagnostics page.

## Tech Stack

- **Language:** TypeScript (strict).
- **Framework:** Next.js 16 (App Router) with React 19, server components, and server actions.
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss`) and a custom serif/sans system (Fraunces + Inter).
- **Database:** PostgreSQL (Vercel Postgres in production).
- **ORM:** Prisma v5 (`prisma generate` + `prisma db push` on every build; no migration history kept in repo).
- **Authentication:** NextAuth.js v4, credentials provider, JWT sessions, bcrypt password hashing.
- **Payments:** Stripe (Checkout sessions + signed webhook endpoint).
- **File uploads:** Vercel Blob (avatars, lodging photos, expense receipts).
- **Email:** Resend.
- **Validation:** Zod.
- **Hosting:** Vercel (project root is the `comedycampsplit/` subdirectory).
- **Lint:** ESLint 9 with `eslint-config-next`.

## Architecture

The repository is a single Next.js application living under `comedycampsplit/`. The root of the repo holds repo-level docs; the app itself is in the subdirectory because Vercel is configured with `Root Directory = comedycampsplit`.

```
comedycampsplit/
├── app/
│   ├── (root pages)         # /, /login, /signup, /admin sign-in
│   ├── actions/             # Server actions: auth, admin, board, contributions,
│   │                        # expenses, guestForm, itinerary, meals, pageNote,
│   │                        # payments, profile, sleeping, withdraw
│   ├── admin/               # Admin dashboard, users, trip pricing, expenses,
│   │                        # contributions, roster, itinerary, meal-plan,
│   │                        # meals, board, page-notes, sleeping, intake,
│   │                        # diagnostics
│   ├── api/
│   │   ├── auth/            # NextAuth route handler
│   │   ├── upload-avatar/   # Vercel Blob upload endpoint
│   │   ├── upload-lodging-photo/
│   │   └── webhooks/stripe/ # Stripe webhook receiver
│   └── dashboard/
│       ├── (member)/        # Per-feature member pages: roster, itinerary,
│       │                    # lodging, sleeping, meals, board, contributions,
│       │                    # expenses, payment, preferences, profile
│       └── intake/          # Guest-form flow (separate layout)
├── components/              # Reusable UI: nav bars, cards, forms,
│                            # ItineraryView, MealsPlanner, etc.
├── lib/                     # Cross-cutting modules:
│                            #   auth, db (Prisma client), stripe, blob,
│                            #   resend, approval, meals, pageNotes,
│                            #   pricing, sleep
├── prisma/
│   ├── schema.prisma        # 23 models incl. User, Trip, Day, ItineraryItem,
│   │                        # ItineraryComment, MealSlot, Bed, etc.
│   └── seed.ts              # Optional seed for the Trip row
└── types/                   # NextAuth + shared TypeScript declarations
```

### App flow in plain English

1. A visitor lands on `/login` and sees the trip's name, destination, and dates pulled from the database. New visitors click through to `/signup`, fill in name + email + password, and are created with status `PENDING`.
2. They are redirected to `/dashboard/intake` to fill in the guest form. Until they submit it, the rest of the dashboard is blocked.
3. The admin signs in at `/admin` (separate UI), reviews the guest form, and approves, rejects, or cancels the applicant. Resend sends the matching email.
4. Once approved, the user can browse the itinerary, lodging, roster, meals page, contributions board, sleeping plan, and expenses. They can claim beds, vote on meals, leave comments on itinerary items, sign up for contributions, and submit expenses.
5. The admin enters housing, transport, and meals totals on `/admin/trip` and locks each line as it firms up. When all three are locked, the trip auto-locks: every approved user becomes `PENDING_PAYMENT` and gets an email with a Stripe Checkout link.
6. The user pays through Stripe. A webhook at `/api/webhooks/stripe` records the payment and flips them to `CONFIRMED_PAID`.

Everything that changes data goes through a typed server action in `app/actions/`. The Prisma client is instantiated once in `lib/db.ts`. Approval gating uses `lib/approval.ts` and a `requireApprovedUser()` pattern inside server actions.

## How to Run Locally

```bash
git clone https://github.com/taylordrew4u2/COMEDYSUMMERCAMP.git
cd COMEDYSUMMERCAMP/comedycampsplit
npm install
cp .env.example .env.local   # fill in values, see below
npm run dev
```

The dev server runs at `http://localhost:3000`.

### Build, lint, database scripts

```bash
npm run build      # prisma generate && prisma db push && next build
npm run lint       # ESLint
npm run db:push    # Apply schema to the database
npm run db:seed    # Insert a placeholder Trip row
npm run db:studio  # Open Prisma Studio
```

### Environment Variables

The app uses environment variables. Variable names only:

```bash
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ADMIN_USERNAME=
ADMIN_PASSWORD_HASH=     # bcrypt hash, see .env.example for the one-liner
ADMIN_EMAIL=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
BLOB_READ_WRITE_TOKEN=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=
```

`.env.example` at `comedycampsplit/.env.example` is the source of truth for which variables are required.

## Usage

After running the app locally and seeding the database:

1. Visit `/signup` and create a participant account.
2. Fill out the guest form at `/dashboard/intake`.
3. In a second browser session, sign in at `/admin` (admin credentials come from the `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` environment variables) and approve the user from `/admin/users`.
4. As the approved user, browse the dashboard, claim a bed, vote on meals, sign up for contributions, and comment on the itinerary.
5. As admin, enter and lock the three cost lines on `/admin/trip` to auto-lock the trip.
6. As the user, complete a Stripe Checkout payment from `/dashboard/payment`. The webhook should mark you `CONFIRMED_PAID`.

## What I Built

- Designed and implemented the entire data model (~23 Prisma models) including the user status machine, three-line cost model, itinerary items + comments, bed assignments with bedmate-request rules, meal poll phases, and the contribution and expense ledgers.
- Built every page in the App Router, mixing React 19 server components with targeted client components only where interactivity is required.
- Implemented every mutation as a typed Next.js server action with explicit auth/role/status checks, instead of REST endpoints, to keep the trust boundary inside one file per feature.
- Implemented the approval-gated UI affordances (read-only mode for `PENDING` users on the itinerary and lodging pages; full read/write for approved users) without weakening the server-side authorization.
- Built the admin pricing flow with per-line lock toggles and the auto-solidify side effect (status transition + transactional emails).
- Built a self-service admin-access system: a bootstrap super-admin defined in the environment, plus a request-and-approve flow (`/admin/request` → `/admin/admins`) that lets existing admins grant or revoke the `ADMIN` role so the app can have multiple admins.
- Integrated Stripe Checkout end-to-end: server action to create the session, a signed webhook to record the payment, and a status update that gates the rest of the app.
- Integrated Vercel Blob for avatar, lodging photo, and receipt uploads.
- Integrated Resend for seven distinct transactional emails and admin event notifications.
- Implemented the itinerary admin tooling — create, edit, reorder up/down, pin, move-to-day, and per-item comment threads.
- Implemented the meals planner UI (`components/MealsPlanner.tsx`) with phase-aware suggestions, voting, helpers, and grocery list.
- Branding pass to "The Trip Handler" across the dashboard nav, admin nav, login/signup/admin headers, page metadata, Stripe product label, and all outgoing emails.

## Technical Decisions

- **Next.js App Router + server actions.** Picked over a separate Express/REST backend because every mutation has session context and Postgres access, so co-locating the auth check, validation, and DB write in one server action removes an entire layer of API surface area. Easier to audit ("does every server action call `requireApprovedUser`?") than scanning a sprawling API route tree.
- **Prisma + `prisma db push`, no migration history.** The app is single-tenant and the schema is owned by one developer, so structured migrations would cost more than they protect. Vercel runs `prisma db push --accept-data-loss` on each build; this is documented as intentional and is appropriate for the trade-off here, but is called out under "Known Limitations" because it is not suitable for multi-tenant production.
- **`TRIP_CAPACITY` (13) decoupled from `COST_SHARE_DIVISOR` (10).** The trip's economics were designed around a 10-way split. Rather than re-baseline every cost UI, the constants were separated: the roster renders 13 slots, but every share calculation reads `COST_SHARE_DIVISOR`. This keeps the per-person price stable as the head count grows.
- **Status machine over feature flags.** Access control is keyed off a single enum (`PENDING`/`APPROVED`/`PENDING_PAYMENT`/`CONFIRMED_PAID`/`CANCELLED`) rather than scattered boolean flags. `lib/approval.ts` centralizes the "is this user approved for X" predicate; every page and server action that gates on approval calls the same helper.
- **Server-side authorization first, UI affordances second.** Read-only mode on the itinerary for pending users hides the comment composer in the client, but the underlying `createItineraryComment` server action also rejects the call from any unapproved user. The UI change is a hint, not the security boundary.
- **Resend used in a best-effort wrapper.** `notifyAdmin` swallows Resend failures so a third-party hiccup never fails the user-visible mutation. User-facing emails are intentionally allowed to throw so the operator notices a misconfigured sender domain.

## Challenges Solved

**Open extra spots without changing the per-person price.**
*Challenge:* The trip was originally costed for 10 people, but the host wanted to invite 13. Re-pricing the trip on the fly would have created drift between the admin's mental model and the UI in multiple places (admin pricing screen, member payment screen, lock-trip email).
*Solution:* Introduced `COST_SHARE_DIVISOR = 10` alongside `TRIP_CAPACITY = 13` and refactored every share computation (admin price page, auto-lock side effect, member payment breakdown, lock-trip email math) to use the divisor. The roster page kept using `TRIP_CAPACITY` for slot count.
*Why it matters:* The decision is now a single edit in `lib/pricing.ts`. The split between capacity and cost is explicit instead of implicit in scattered constants.

**Pending users that can browse but not edit.**
*Challenge:* Originally, unapproved users were redirected away from the itinerary and lodging pages by an `ApprovalRequired` gate. The desired behavior was: anyone signed in can see those pages, but cannot write.
*Solution:* Removed the approval gate at the page level for those two routes, threaded a `canComment` boolean through `ItineraryView` to suppress the comment composer and per-comment edit/delete affordances for pending users, and confirmed the underlying server actions (`createItineraryComment`, `updateItineraryComment`, `deleteItineraryComment`) still reject unapproved users via `requireApprovedUser`.
*Why it matters:* Lets the admin onboard people who are "still being decided on" so they can see what they'd be signing up for, without leaking write access.

**Single beds reserved for female members, with automatic reassignment.**
*Challenge:* The lodging has a few single beds that should be claimable by female members even if a male member already claimed one. Doing this manually creates an awkward, error-prone conversation.
*Solution:* When a female member claims a single bed that's already occupied, the system reassigns it, sends the displaced user a "your bed was reassigned, here's a link to pick again" email through Resend, and updates the bed assignment atomically.
*Why it matters:* The rule is enforced in code, communicated in writing, and recoverable in one click — the host doesn't have to broker it.

## Testing

Automated tests are not currently implemented.

Manual testing should cover:

- The end-to-end flow: signup → intake → admin approval → bed claim → meal vote → admin locks pricing → Stripe checkout → status flips to `CONFIRMED_PAID`.
- Approval-gated pages: a `PENDING` user can read the itinerary and lodging but not comment; an `APPROVED` user can comment, edit, and delete their own comments; admin can delete any comment.
- Form validation on signup, intake, expenses, and bed claims.
- Error states on Stripe failures and Resend failures (the user-visible action should still succeed when admin notification email fails, per design).
- Mobile/responsive layout for the member dashboard, especially the itinerary, meals planner, and payment screens.
- Data persistence and revalidation: editing an itinerary item should be visible to other users on next navigation or refresh.

## Security

What is implemented and visible in the codebase:

- Secrets are not committed; `.env.example` documents required variable names only.
- All Server Actions check the session via `getServerSession(authOptions)` before any database mutation. User and trip IDs are read from the session, never trusted from client-supplied arguments.
- Authorization is layered: page-level (server component returns gated content), action-level (`requireAdmin` / `requireApprovedUser` / `requireSelf`), and resource-level (e.g. a user can only edit their own comment).
- Trip-scoped data (beds, expenses, meal slots, contributions, the roster) is filtered by the user's `tripId` on the server, so members in trip A can't read or write to data in trip B even by crafting a request directly.
- Admin actions (approve user, lock trip, set prices, manage rosters, delete trips, etc.) all require the `ADMIN` role server-side.
- Stripe Checkout sessions derive the `tripShare` server-side from the user's locked trip — the client cannot influence the amount charged.
- Passwords are hashed with bcrypt (cost factor 10).
- The Stripe webhook validates the signature before trusting the payload.
- File uploads (avatar, lodging photo) authenticate the session and validate content type + size before forwarding to Vercel Blob.
- Private vulnerability reports go to the email listed in [`SECURITY.md`](./SECURITY.md).

What is **not** implemented and would be expected in a production-hardening pass:

- No rate limiting on the auth endpoints or on the signup form.
- No CSRF protection beyond what NextAuth/server actions provide by default.
- No automated audit logging.
- Admin credentials default to a single hardcoded record in `lib/auth.ts`; suitable for single-tenant private use, not for multi-admin scenarios.

Security hardening is ongoing — see `SECURITY.md` for reporting.

## Accessibility

What is true in the codebase:

- Semantic HTML for headings, forms, lists, and navigation.
- Form inputs are labeled.
- Color choices use the Tailwind `stone` palette and `amber`/`emerald` accents at contrast levels intended for readable text.
- Layouts are responsive (mobile breakpoints throughout).

A dedicated accessibility audit (screen reader testing, focus management on modals, keyboard traversal of the meals planner, contrast verification) has not been performed. Accessibility review is a future improvement.

## Known Limitations

- No automated test suite.
- Prisma migration history is not committed; the app uses `prisma db push --accept-data-loss` at build time. Not suitable for multi-tenant production.
- Admin user is configured via code (`lib/auth.ts`) rather than the database.
- Screenshots are not yet included.

## Roadmap

- Add automated tests (Vitest or Playwright) starting with the auth + approval + payment flow.
- Move admin user from code to database with hashed credentials and a password-reset path.
- Replace `prisma db push --accept-data-loss` with a real migration history before any data the user can't afford to lose lands in production.
- Add screenshots of the main flows to this README.
- Accessibility review.
- Rate-limiting on auth and signup.

## Status

Active. The app is deployed at the URL above and used by one organizer. Active development is ongoing; recent commits cover multi-trip support, a meal-poll redesign, an itinerary item + comments model, brand rename, the 13-slot capacity / 10-way cost split, a security audit hardening every server action and API route, and a CI workflow that runs `tsc --noEmit` + `eslint` on every PR.

## License

MIT — see [`LICENSE`](./LICENSE).
