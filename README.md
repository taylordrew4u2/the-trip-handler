# COMEDYSUMMERCAMP

Monorepo containing **ComedyCampSplit** — a Next.js app for organizing a comedian summer camp trip (roster, expenses, contribution board, Stripe payments).

The actual app lives in [`comedycampsplit/`](./comedycampsplit). Everything below is the **manual checklist** you (Taylor) need to complete on your end so the app deploys cleanly to Vercel.

---

## TL;DR — What you have to do manually

You need accounts and credentials from **5 services** before Vercel can build successfully:

1. **Vercel** — host the app + Postgres + Blob storage
2. **Stripe** — payment processing + webhook
3. **Resend** — transactional emails
4. **GitHub** — connect this repo to Vercel
5. **A custom domain (optional)** — point it at Vercel

Then you paste a handful of environment variables into Vercel, push the schema to Postgres, and seed the trip row. Detailed steps are below.

---

## Stack overview (so you know what you're paying for)

| Service | What it's for | Free tier OK? |
|---|---|---|
| Vercel | Hosting + serverless functions | Yes (Hobby plan) |
| Vercel Postgres | Database | Yes (Hobby) |
| Vercel Blob | Avatar + receipt uploads | Yes (Hobby) |
| Stripe | Card payments + webhook | Pay per transaction, no monthly fee |
| Resend | Approval + trip-lock emails | Yes (3,000 emails/mo free) |

---

## Step 1 — Push this repo to GitHub

If you're reading this on github.com you're done. Otherwise:

```bash
git remote add origin https://github.com/<your-username>/COMEDYSUMMERCAMP.git
git push -u origin main
```

---

## Step 2 — Create the Vercel project

1. Go to <https://vercel.com/new>.
2. Click **Import Git Repository** and select `COMEDYSUMMERCAMP`.
3. **Important — set the Root Directory.** Vercel will ask which folder the app is in. Click **Edit** next to "Root Directory" and choose `comedycampsplit`. The framework should auto-detect as **Next.js**.
4. Leave the build/install/dev commands as default — they're already configured in `comedycampsplit/vercel.json`:
   - Build: `prisma generate && next build`
   - Install: `npm install`
   - Dev: `next dev`
5. **Do NOT click Deploy yet.** First add the env vars in Step 3 — otherwise the first build will fail.

---

## Step 3 — Provision Vercel Postgres + Vercel Blob

In your new Vercel project:

1. Go to **Storage** tab → **Create Database** → choose **Postgres**. Pick a region close to you. Click Create.
2. Click **Connect Project** and connect it to your project. This auto-injects `DATABASE_URL` (and the other Postgres vars) into your environment variables.
3. Back in **Storage**, click **Create** again → choose **Blob**. Connect it to the project. This auto-injects `BLOB_READ_WRITE_TOKEN`.

---

## Step 4 — Create a Stripe account and get keys

1. Sign up at <https://stripe.com> if you don't have an account.
2. Go to <https://dashboard.stripe.com/apikeys>.
3. Copy your **Publishable key** (starts with `pk_live_…` for production, or `pk_test_…` for testing).
4. Reveal and copy your **Secret key** (starts with `sk_live_…` / `sk_test_…`).

You'll come back later to set up the webhook (Step 7) — you need your deployed URL first.

> Tip: Use the **test** keys (`pk_test_…` / `sk_test_…`) for the first deploy so you can verify the checkout flow with Stripe's test card `4242 4242 4242 4242`. Swap to live keys once it works.

---

## Step 5 — Create a Resend account and verified sender

1. Sign up at <https://resend.com>.
2. Go to **API Keys** → **Create API Key**. Copy the key (starts with `re_…`).
3. Go to **Domains** → **Add Domain**. Add the domain you'll send from (e.g. `comedysummercamp.com`).
4. Add the DNS records Resend gives you (TXT/MX/CNAME) at your DNS provider. Wait for them to verify.
5. If you don't have a domain yet, you can use Resend's `onboarding@resend.dev` sender to test, but real users will see emails go to spam — get a verified domain before launch.

---

## Step 6 — Add all environment variables in Vercel

In your Vercel project: **Settings → Environment Variables**. Add each of the following for **all three environments** (Production, Preview, Development) unless noted.

| Variable | Where to get it | Example |
|---|---|---|
| `DATABASE_URL` | Auto-set by Vercel Postgres in Step 3 | `postgres://…` |
| `NEXTAUTH_SECRET` | Generate one: `openssl rand -base64 32` | `xK9p…` |
| `NEXTAUTH_URL` | Your Vercel URL — set to your **production domain** in Production, and `http://localhost:3000` in Development | `https://comedysummercamp.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | Same as `NEXTAUTH_URL` (this one is exposed to the browser) | `https://comedysummercamp.vercel.app` |
| `STRIPE_SECRET_KEY` | Stripe → API keys → Secret key | `sk_live_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → API keys → Publishable key | `pk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | Set in Step 7 after first deploy | `whsec_…` |
| `RESEND_API_KEY` | Resend → API Keys | `re_…` |
| `BLOB_READ_WRITE_TOKEN` | Auto-set by Vercel Blob in Step 3 | `vercel_blob_rw_…` |

> **Heads up:** `STRIPE_WEBHOOK_SECRET` doesn't exist yet — leave it blank or set a placeholder for the first deploy. The build won't crash because the Stripe client is lazily initialized. You'll fill it in during Step 7.

Now click **Deploy**. The first build should succeed. Note the production URL Vercel gives you (e.g. `https://comedysummercamp.vercel.app`).

---

## Step 7 — Set up the Stripe webhook

The app listens for Stripe payment events at `/api/webhooks/stripe`.

1. In Stripe Dashboard, go to <https://dashboard.stripe.com/webhooks> → **Add endpoint**.
2. **Endpoint URL:** `https://<your-vercel-url>/api/webhooks/stripe`
3. **Events to send:** select at minimum:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Save. Copy the **Signing secret** (starts with `whsec_…`).
5. Go back to Vercel → Settings → Environment Variables. Set `STRIPE_WEBHOOK_SECRET` to that value.
6. **Redeploy** so the new env var takes effect (Deployments → latest → ⋯ → Redeploy).

---

## Step 8 — Push the database schema and seed the trip row

Vercel does **not** run `prisma db push` automatically. You must do this once from your laptop.

```bash
cd comedycampsplit
npm install

# Pull production env vars into a local .env file
npx vercel link            # link this folder to the Vercel project
npx vercel env pull .env   # downloads DATABASE_URL etc.

# Create tables in your Vercel Postgres database
npx prisma db push

# Seed the initial trip row + admin user
npm run db:seed
```

You should now be able to visit `https://<your-url>/admin` and log in with the hardcoded admin credentials (see [comedycampsplit/README.md](./comedycampsplit/README.md)).

> Re-run `npx prisma db push` any time the schema in `comedycampsplit/prisma/schema.prisma` changes.

---

## Step 9 — (Optional) Custom domain

1. Vercel project → **Settings → Domains** → **Add**.
2. Type your domain (e.g. `comedysummercamp.com`). Vercel shows DNS records to add.
3. At your DNS provider, add the A / CNAME records exactly as shown. Wait for verification.
4. Once live, **update both `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to the new domain** and redeploy.
5. Update the Stripe webhook URL (Step 7) to use the new domain too.

---

## Step 10 — Smoke test before going live

- [ ] Visit your URL → redirects to `/login`
- [ ] Sign up a test participant → see "pending approval" state
- [ ] Log in to `/admin` (Taylor / weed69) → approve the test user
- [ ] As the test user, see the dashboard, roster, itinerary
- [ ] Upload an avatar → confirm it appears (verifies Vercel Blob)
- [ ] Submit an expense with a receipt → confirm upload works
- [ ] Lock the trip from `/admin/trip` → confirm Resend email arrives
- [ ] Pay via Stripe Checkout (use `4242 4242 4242 4242` on test keys) → status flips to **Confirmed & Paid**
- [ ] Check Stripe webhook logs → events show as **Succeeded** (not 4xx/5xx)

If the webhook is failing: double-check `STRIPE_WEBHOOK_SECRET` is exactly the signing secret from Stripe and that you redeployed after adding it.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails with `prisma: command not found` | Make sure Root Directory is `comedycampsplit` in Vercel project settings |
| Build fails citing Stripe env vars | Double-check `STRIPE_SECRET_KEY` is set; the client is lazy so a missing webhook secret is OK at build time |
| `NEXTAUTH_URL` mismatch / login loop | Set `NEXTAUTH_URL` to the exact deployed URL (no trailing slash) and redeploy |
| Emails not arriving | Verify the sender domain in Resend; check Resend logs for delivery status |
| Avatars/receipts won't upload | `BLOB_READ_WRITE_TOKEN` missing — reconnect the Blob store to the project |
| `prisma db push` errors locally | Re-run `npx vercel env pull .env` to refresh `DATABASE_URL` |

---

## Local development

See [`comedycampsplit/README.md`](./comedycampsplit/README.md) for running the app locally with `npm run dev`.

---

## Repo layout

```
COMEDYSUMMERCAMP/
├── comedycampsplit/        ← the Next.js app (deployed root)
│   ├── app/                  Next.js App Router routes
│   ├── components/
│   ├── lib/                  Stripe, Resend, Prisma, NextAuth helpers
│   ├── prisma/               schema.prisma + seed
│   ├── vercel.json           Vercel build config
│   └── README.md             app-level docs
└── README.md               ← you are here (deployment guide)
```
