# ComedyCampSplit 🎪

A full-stack web app for organizing a single comedian summer camp trip — expense splitting, participant roster, contribution board, and Stripe payments. 100% Vercel-deployed.

## Tech Stack

- **Framework:** Next.js 16 App Router + TypeScript + Tailwind CSS
- **Database:** Vercel Postgres + Prisma ORM
- **Auth:** NextAuth.js v4 (credentials provider)
- **Payments:** Stripe Checkout + webhooks
- **File Uploads:** Vercel Blob (profile avatars + receipts)
- **Emails:** Resend (approval + trip-lock notifications)
- **Deployment:** Vercel (one-click)

## Features

### Participant Flow
1. Sign up → account is **pending** until admin approves
2. After approval: access the dashboard, view the live **"Who's Coming"** roster, itinerary, expenses, and contribution board
3. After admin locks the trip: confirm & pay via Stripe

### Admin Flow (Taylor / weed69)
- Approve/reject/cancel participants
- Edit all trip details inline (destination, dates, itinerary, lodging, meals)
- Manage expenses (approve, delete, view receipts)
- Manage contribution board
- Send final lock email + lock the trip
- Export roster as CSV

### Roster ("Who's Coming")
- Real-time roster with **30-second auto-refresh**
- Status badges: Approved (blue) · Confirmed & Paid (green) · Payment Due (yellow) · Cancelled (red)
- Search by name, username, or bio
- Sort by name (A-Z), newest, or status
- Profile picture, comedy bio/tag, and linked contribution items per card
- Header: "X Approved · Y Confirmed & Paid"

## Getting Started

### 1. Clone & Install

```bash
cd comedycampsplit
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Vercel Postgres connection string |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `NEXTAUTH_URL` | Your app URL (e.g. `https://yourapp.vercel.app`) |
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `RESEND_API_KEY` | Resend API key for emails |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (pk_live_...) |
| `NEXT_PUBLIC_APP_URL` | Your app URL |

### 3. Set Up Database

```bash
npm run db:push    # Create tables from Prisma schema
npm run db:seed    # Seed initial trip record
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## One-Click Deploy to Vercel

After deploying:
1. Add all environment variables in the Vercel dashboard
2. Run `npx prisma db push` against your Vercel Postgres instance
3. Configure Stripe webhook endpoint: `https://yourapp.vercel.app/api/webhooks/stripe`

## Routes

| Route | Description |
|---|---|
| `/` | Redirects to `/login` |
| `/login` | Participant login |
| `/signup` | Participant signup (creates pending account) |
| `/admin` | Admin login (Taylor / weed69) |
| `/admin/dashboard` | Admin stats overview |
| `/admin/users` | Approve/reject/cancel users |
| `/admin/trip` | Edit trip details + lock trip |
| `/admin/expenses` | Manage all expenses |
| `/admin/contributions` | Manage contribution board |
| `/admin/roster` | Full roster with CSV export |
| `/dashboard` | Participant trip summary |
| `/dashboard/roster` | "Who's Coming" live roster |
| `/dashboard/itinerary` | Trip schedule |
| `/dashboard/expenses` | Submit & view expenses |
| `/dashboard/contributions` | Sign up for contribution items |
| `/dashboard/payment` | Stripe checkout (post-lock) |

## Security Notes

- Admin credentials are hardcoded (Taylor/weed69) — suitable for a private, single-use app
- Participants cannot access any page until their account is approved
- No payment amounts are shown publicly
- All Server Actions validate session before any database mutation
