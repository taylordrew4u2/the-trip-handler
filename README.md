# The Trip Handler

[![CI](https://github.com/taylordrew4u2/the-trip-handler/actions/workflows/ci.yml/badge.svg)](https://github.com/taylordrew4u2/the-trip-handler/actions/workflows/ci.yml)

A full-stack Next.js application for organizing group trips. Anyone can create a trip, share a private invite link or join code, collect applications, approve who comes, and plan the logistics — lodging, meals, itinerary, contributions, expenses, and Stripe-collected per-person payments. Members who aren't on a trip yet get a home screen to create one, take a guided walkthrough, or join by code.

## Live Demo

**<https://the-trip-handler.vercel.app>**

It's invite-only by design, so there's no public trip directory. **Create an account** to land on the home screen, then start your own trip — name it, get a shareable invite link and join code, and manage applicants, lodging, the meal poll, contributions, expenses, and per-person pricing.

> Want to explore with pre-filled data locally? An optional seed script (`npm run db:seed`) creates a demo trip with a roster, itinerary, contributions, and expenses for development.

## Screenshots

Run the demo locally to capture these — `npm run db:seed && npm run dev` — then save PNGs to `docs/screenshots/` and uncomment the block below.

<!--
| Home screen | Trip dashboard | Meal poll |
| --- | --- | --- |
| ![Home screen](docs/screenshots/home.png) | ![Trip dashboard](docs/screenshots/dashboard.png) | ![Meal poll](docs/screenshots/meals.png) |
-->

The architecture diagram below renders directly on GitHub.

## Overview

**The Trip Handler** is a web app for the friend who accidentally became the adult in charge of making the plan. Instead of juggling group chats, spreadsheets, and Venmo requests, a trip organizer gets one place to run their trip end to end — and everyone they invite gets one dashboard for their share of it.

It is multi-tenant and invite-only:

- A signed-in member with no trip lands on a **home screen** (`/dashboard/start`) where they choose to create a trip, take a guided **walkthrough**, or **find a trip by code** — they are never auto-dropped into someone else's trip.
- Any signed-in member can **create a trip** and becomes its **owner**.
- Each trip has a **private invite link** (`/join/[token]`) and a short, owner-issued **join code**. There is no public trip directory — you only get in with a link or a code from the organizer.
- People who open the link (or enter the code) **apply**; the owner **approves or rejects** them.
- The owner edits the trip's details (destination, dates, description, itinerary/lodging/meals notes) and only ever sees and manages **their own** trips.

Each invited person has a single dashboard that unlocks more functionality as their status moves from `PENDING` → `APPROVED` → `PENDING_PAYMENT` → `CONFIRMED_PAID`.

## How it works

```mermaid
flowchart LR
  S[Sign up] --> H["Home screen<br/>(/dashboard/start)"]
  H --> Q{Host or join?}
  Q -- Host --> C["Create trip<br/>(/dashboard/my-trips)"]
  C --> L["Share invite link<br/>or join code"]
  Q -- Join --> L
  L --> A["Apply + guest form<br/>(/join/&lt;token&gt;)"]
  A --> R{Owner reviews}
  R -- Reject --> X[Declined]
  R -- Approve --> AP[APPROVED]
  AP --> P["Owner locks the<br/>3-line pricing"]
  P --> PP["PENDING_PAYMENT<br/>+ checkout email"]
  PP --> ST[Stripe Checkout]
  ST --> CP[CONFIRMED_PAID]
```

Every state transition is enforced server-side, and every owner action is scoped to trips that owner created.

## Problem

Organizing a multi-day group trip creates a lot of repetitive coordination work:

- Collecting applications and screening who's coming.
- Splitting total costs (house rental, transit, meals) fairly when those numbers change while the plan is still forming.
- Tracking who has paid, who still owes, and what each person owes including a refundable deposit.
- Assigning beds without conflicts and respecting per-bed rules.
- Collecting meal preferences and producing a grocery plan.
- Keeping an itinerary the whole group can read, comment on, and see updates to.
- Sending the right transactional emails ("you're approved", "trip is locked, time to pay") without missing anyone.

A group chat and a spreadsheet can do any one of those, but no single one, and they decay fast as the plan changes.

## Solution

The Trip Handler centralizes a trip owner's workflow and each participant's view into one authenticated web app:

- **Create + invite.** Any member creates a trip, gets a unique invite link, and shares it with whoever they want. The owner can open/close applications at any time.
- **Apply + approve.** Invitees apply through the link (signing up if they don't have an account, or one-click if they do). The owner reviews applicants and approves or rejects them from `/dashboard/my-trips`.
- **Ownership isolation.** Every owner action is checked server-side against trip ownership — an owner can only ever see and manage trips they created.
- **Trip details.** Owners edit destination, dates, description, and itinerary/lodging/meals notes shown on the invite page.
- **Participant tools.** Approved members claim beds, vote on meals, comment on the itinerary, sign up for contributions, and submit expenses; status drives what each member can see and do.
- **Stripe checkout.** Per-person share + refundable deposit, collected through Stripe Checkout, with a signed webhook that records payment and advances status.
- **Transactional emails.** Resend handles approval, rejection, cancellation, form-unlocked, bed-bump, and trip-locked messages.

## Tech Stack

- **Language:** TypeScript (strict).
- **Framework:** Next.js 16 (App Router) with React 19, server components, and server actions.
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss`) and a custom serif/sans system (Fraunces + Inter).
- **Database:** PostgreSQL (Vercel Postgres in production).
- **ORM:** Prisma v5 (`prisma generate` + versioned `prisma migrate deploy` on every build; migration history committed under `prisma/migrations`).
- **Authentication:** NextAuth.js v4, credentials provider, JWT sessions, bcrypt password hashing.
- **Payments:** Stripe (Checkout sessions + signed webhook endpoint).
- **File uploads:** Vercel Blob (avatars, lodging photos, expense receipts).
- **Email:** Resend.
- **Validation:** Zod.
- **Hosting:** Vercel (deployed from the repository root).
- **Lint:** ESLint 9 with `eslint-config-next`.

## Architecture

```mermaid
flowchart TD
    subgraph Client["Browser"]
        UI["React 19 Server + Client Components<br/>Tailwind 4"]
    end
    subgraph Next["Next.js 16 on Vercel"]
        Pages["App Router pages<br/>/login · /dashboard · /join/[token]"]
        Actions["Typed Server Actions<br/>(auth + ownership checks)"]
        API["Route Handlers<br/>NextAuth · uploads · Stripe webhook"]
    end
    DB[("PostgreSQL<br/>via Prisma ORM")]
    Stripe["Stripe Checkout"]
    Blob["Vercel Blob"]
    Resend["Resend email"]

    UI -->|form submit| Actions
    UI -->|navigation| Pages
    Pages --> Actions
    Actions -->|"validated (Zod)"| DB
    API --> DB
    Actions -->|create session| Stripe
    Stripe -->|webhook| API
    Actions -->|avatars / receipts| Blob
    Actions -->|approval / payment emails| Resend
```

Every state change flows through a typed **server action** that re-checks authentication and trip ownership before touching the database — the client never holds privileged logic.

The repository is a single Next.js application at its root, deployed by Vercel from the repo root.

```
.
├── app/
│   ├── (root pages)         # /, /login, /signup
│   ├── actions/             # Server actions: auth, trips, board, contributions,
│   │                        # expenses, guestForm, itinerary, meals, payments,
│   │                        # profile, sleeping, withdraw
│   ├── join/[token]/        # Public invite page — apply to a trip by link
│   ├── api/
│   │   ├── auth/            # NextAuth route handler
│   │   ├── upload-avatar/   # Vercel Blob upload endpoint
│   │   ├── upload-lodging-photo/
│   │   └── webhooks/stripe/ # Stripe webhook receiver
│   └── dashboard/
│       ├── (member)/        # Per-feature member pages: roster, itinerary,
│       │                    # lodging, sleeping, meals, board, contributions,
│       │                    # expenses, payment, preferences, profile
│       ├── my-trips/        # Owner area: create trips, invite links,
│       │                    # approve applicants, edit trip details
│       └── intake/          # Guest-form flow (separate layout)
├── components/              # Reusable UI: nav bars, cards, forms,
│                            # ItineraryView, MealsPlanner, etc.
├── lib/                     # Cross-cutting modules:
│                            #   auth, db (Prisma client), stripe, blob,
│                            #   resend, approval, meals, pageNotes,
│                            #   pricing, sleep, trip
├── prisma/
│   ├── schema.prisma        # Data model: User, Trip, Day, ItineraryItem,
│   │                        # ItineraryComment, MealSlot, Bed, etc.
│   └── seed.ts              # Optional seed for a Trip row
└── types/                   # NextAuth + shared TypeScript declarations
```

### App flow in plain English

1. A visitor lands on `/login`. New visitors go to `/signup` and create an account (name + email + password) with status `PENDING`.
2. A signed-in member who isn't on a trip lands on the **home screen** (`/dashboard/start`): create a trip, take the guided walkthrough (`/dashboard/walkthrough`), or enter a trip's join code. (If they followed an invite link, they go straight to that trip's apply page instead.)
3. To **host**, they open `/dashboard/my-trips`, name a trip (becoming its owner), and get a private invite link plus a short join code to share.
4. To **join**, they open someone's invite link (`/join/[token]`) or enter the trip's join code on the home screen (which resolves to the same apply page). Logged-out visitors apply by signing up to that trip; logged-in members apply in one click. Applicants fill in the guest form.
5. The trip owner reviews applicants on `/dashboard/my-trips` and approves or rejects them. Resend sends the matching email.
6. Once approved, the participant can browse the itinerary, lodging, roster, meals, contributions, sleeping plan, and expenses, and take the actions their status allows.
7. Payment runs through Stripe Checkout; a webhook at `/api/webhooks/stripe` records it and flips the user to `CONFIRMED_PAID`.

Everything that changes data goes through a typed server action in `app/actions/`. The Prisma client is instantiated once in `lib/db.ts`. Approval gating uses `lib/approval.ts` and a `requireApprovedUser()` pattern; owner actions verify trip ownership against the session user.

## How to Run Locally

```bash
git clone https://github.com/taylordrew4u2/the-trip-handler.git
cd the-trip-handler
npm install
cp .env.example .env.local   # fill in values, see below
npm run dev
```

The dev server runs at `http://localhost:3000`.

### Build, lint, database scripts

```bash
npm run build      # prisma generate && apply migrations && next build
npm run lint       # ESLint
npm run db:migrate # Create a new migration from schema changes (dev)
npm run db:deploy  # Apply committed migrations to the database
npm run db:push    # Push schema without a migration (prototyping only)
npm run db:seed    # Seed a demo organizer + trip + applicants (see Live Demo)
npm run db:studio  # Open Prisma Studio
```

### Environment Variables

The app uses environment variables. Variable names only:

```bash
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ADMIN_EMAIL=                          # optional: receives operational email alerts
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
BLOB_READ_WRITE_TOKEN=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=
```

`.env.example` at the repository root is the source of truth for which variables are required.

## Usage

After running the app locally and seeding the database:

1. Visit `/signup` and create an account.
2. Sign in, open `/dashboard/my-trips`, and create a trip. Copy its invite link.
3. In a second browser session, open the invite link, apply to the trip, and fill out the guest form.
4. Back as the owner, approve the applicant from `/dashboard/my-trips`.
5. As the approved participant, browse the dashboard, claim a bed, vote on meals, sign up for contributions, and comment on the itinerary.
6. Complete a Stripe Checkout payment from `/dashboard/payment`. The webhook marks you `CONFIRMED_PAID`.

## What I Built

- Designed and implemented the data model (User status machine, Trip ownership + invite tokens, three-line cost model, itinerary items + comments, bed assignments with bedmate-request rules, meal-poll phases, and the contribution and expense ledgers).
- Built every page in the App Router, mixing React 19 server components with targeted client components only where interactivity is required.
- Implemented every mutation as a typed Next.js server action with explicit auth/ownership/status checks, instead of REST endpoints, to keep the trust boundary inside one file per feature.
- Built **multi-tenant, invite-only trips**: any member creates a trip (becoming its owner), gets a private invite link (`/join/[token]`), and reviews/approves applicants and edits trip details from `/dashboard/my-trips` — all scoped so an owner only ever touches trips they own.
- Implemented the approval-gated UI affordances (read-only mode for `PENDING` users on the itinerary and lodging pages; full read/write for approved users) without weakening the server-side authorization.
- Integrated Stripe Checkout end-to-end: server action to create the session, a signed webhook to record the payment, and a status update that gates the rest of the app.
- Integrated Vercel Blob for avatar, lodging photo, and receipt uploads, and Resend for the transactional emails.
- Implemented the meals planner UI (`components/MealsPlanner.tsx`) with phase-aware suggestions, voting, helpers, and grocery list, and the itinerary view with per-item comment threads.

## Technical Decisions

- **Next.js App Router + server actions.** Picked over a separate Express/REST backend because every mutation has session context and Postgres access, so co-locating the auth check, validation, and DB write in one server action removes an entire layer of API surface area. Easier to audit ("does every server action check the session?") than scanning a sprawling API route tree.
- **Prisma with versioned migrations.** Migration history is committed under `prisma/migrations`, and Vercel runs `prisma migrate deploy` on each build (via `scripts/db-deploy.sh`), so schema changes are reviewable in the diff and applied without dropping data. CI applies the migrations to a real Postgres and fails on any drift between `schema.prisma` and the committed migrations, so the two can never silently diverge.
- **Status machine over feature flags.** Access control is keyed off a single enum (`PENDING`/`APPROVED`/`PENDING_PAYMENT`/`CONFIRMED_PAID`/`CANCELLED`) rather than scattered boolean flags. `lib/approval.ts` centralizes the "is this user approved for X" predicate.
- **Server-side authorization first, UI affordances second.** Read-only mode on the itinerary for pending users hides the comment composer in the client, but the underlying `createItineraryComment` server action also rejects the call from any unapproved user. The UI change is a hint, not the security boundary.
- **Ownership checks for owner actions.** Trip-management actions resolve the trip from its id and confirm `trip.ownerId === session.user.id` before mutating, so a member can never act on a trip they don't own even by crafting the request directly.

## Testing

Unit tests run with **Vitest** (`npm test`) and execute in CI on every PR. They cover the pure pricing/approval/meal-slot logic and the authorization guards on the owner trip actions (ownership checks, and that applying to a trip never silently moves a member off another trip) using mocked Prisma and session boundaries.

Manual testing should additionally cover:

- The end-to-end flow: signup → create trip → share invite → apply → owner approves → bed claim → meal vote → Stripe checkout → status flips to `CONFIRMED_PAID`.
- Ownership isolation: an owner only sees/manages their own trips and applicants; acting on another owner's trip is rejected server-side.
- Approval-gated pages: a `PENDING` user can read the itinerary and lodging but not comment; an `APPROVED` user can comment, edit, and delete their own comments.
- Form validation on signup, intake, expenses, and bed claims.
- Error states on Stripe and Resend failures.
- Mobile/responsive layout for the member dashboard.

## Security

What is implemented and visible in the codebase:

- Secrets are not committed; `.env.example` documents required variable names only.
- All server actions check the session via `getServerSession(authOptions)` before any database mutation. User and trip IDs are read from the session, never trusted from client-supplied arguments.
- Authorization is layered: page-level (server component returns gated content), action-level (`requireApprovedUser` / ownership checks), and resource-level (e.g. a user can only edit their own comment).
- Trip-scoped data is filtered by the user's `tripId` on the server, and owner actions verify trip ownership, so members can't read or write to trips they aren't part of or don't own.
- Stripe Checkout sessions derive the charged amount server-side from the user's locked trip — the client cannot influence it.
- Passwords are hashed with bcrypt (cost factor 10).
- The Stripe webhook validates the signature before trusting the payload.
- File uploads authenticate the session and validate content type + size before forwarding to Vercel Blob.
- Private vulnerability reports go to the email listed in [`SECURITY.md`](./SECURITY.md).

What is **not** implemented and would be expected in a production-hardening pass:

- No rate limiting on the auth endpoints or the signup form.
- No CSRF protection beyond what NextAuth/server actions provide by default.
- No automated audit logging.

Security hardening is ongoing — see `SECURITY.md` for reporting.

## Accessibility

- Semantic HTML for headings, forms, lists, and navigation; labeled form inputs.
- Color choices use the Tailwind `stone` palette with accents at contrast levels intended for readable text.
- Layouts are responsive (mobile breakpoints throughout).

A dedicated accessibility audit (screen reader testing, focus management, keyboard traversal) has not been performed and is a future improvement.

## Known Limitations

- The deeper relational subsystems (per-person cost-split lock/solidify, bed-layout setup, meal-poll phase control, contribution posting, expense approval) are modeled and partly surfaced to participants, but their owner-facing management UI is still being built — owners currently get trip creation, invites, applicant approval, and descriptive details.
- Screenshots are not yet included.

## Roadmap

- Wire the full per-trip management toolset (pricing, bed layout, meal-poll control, contributions, expenses) to trip owners.
- Add automated tests (Vitest or Playwright) starting with the auth + approval + payment flow.
- Add screenshots of the main flows.
- Accessibility review and rate-limiting on auth and signup.

## License

MIT — see [`LICENSE`](./LICENSE).
