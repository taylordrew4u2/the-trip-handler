# COMEDYSUMMERCAMP — Setup Guide

This is the **Next.js app** for organizing the comedian summer camp trip (roster, expenses, Stripe payments, emails). The app code lives in [`comedycampsplit/`](./comedycampsplit). This README is the **only thing you need to follow** to get the site live.

> **Read this top to bottom. Do the steps in order. Don't skip.** Each step has a "How to know it worked" check — don't move on until that check passes.

---

## 🔥 Right now — do this first

Production is deploying but every page returns **500** because `NEXTAUTH_SECRET` is not set in Vercel. Until you fix this, nothing else matters.

1. Generate a secret:
   ```bash
   openssl rand -base64 32
   ```
2. Vercel → **Settings → Environment Variables** → add:
   - `NEXTAUTH_SECRET` = (output from step 1) — apply to Production, Preview, Development
   - `NEXTAUTH_URL` = your production URL (e.g. `https://comedysummercamp.vercel.app`) — Production
3. **Deployments → ⋯ → Redeploy** the latest `main` build. Env-var changes don't apply to existing deploys.
4. While you're in env vars, scan the table in **Step 7** below for anything else still blank.

---

## ☑️ Progress checklist (tick as you go)

Copy this into a notes app and tick each box yourself. **All boxes must be ticked before the site works.**

- [x] **1.** GitHub repo exists and code is pushed ✅
- [x] **2.** Vercel project created, root directory set to `comedycampsplit` ✅
- [ ] **3.** Vercel Postgres database created and connected
- [ ] **4.** Vercel Blob store created and connected
- [ ] **5.** Stripe account created, API keys copied
- [ ] **6.** Resend account created, sender domain verified, API key copied
- [ ] **7.** All environment variables pasted into Vercel (see Step 7 table) — ⚠️ **`NEXTAUTH_SECRET` confirmed missing in production**
- [x] **8a.** Build succeeds in Vercel ✅ (latest deploy on `main` builds green)
- [ ] **8b.** Deployed site loads without 500s — blocked on Step 7
- [ ] **9.** Stripe webhook created and `STRIPE_WEBHOOK_SECRET` added to Vercel
- [ ] **10.** Database schema pushed (`npx prisma db push`) and seeded (`npm run db:seed`) from your laptop
- [ ] **11.** (Optional) Custom domain attached and `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` updated
- [ ] **12.** Smoke test passed (full list at the bottom)

---

## 🚧 What's left to finish (current status)

The codebase is ready and the build is green. **All remaining work is account/config setup in Vercel + Stripe + Resend — no code changes needed.** In priority order:

1. **Set `NEXTAUTH_SECRET` + `NEXTAUTH_URL` in Vercel** and redeploy. *(See "Right now" box above. This is currently the only thing breaking production.)*
2. **Provision storage:** Postgres (Step 3) + Blob (Step 4). These auto-add `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN`.
3. **Get third-party keys:** Stripe test keys (Step 5) and Resend API key + verified sender domain (Step 6).
4. **Fill the rest of the env vars** (Step 7) — the full list is in the table. `EMAIL_FROM` is required (the app no longer hardcodes a sender).
5. **Redeploy** so all the new env values take effect (Step 8).
6. **Add the Stripe webhook** at `/api/webhooks/stripe`, paste the signing secret into `STRIPE_WEBHOOK_SECRET`, redeploy (Step 9).
7. **Push the DB schema and seed** from your laptop — Vercel won't do this for you (Step 10).
8. **Run the smoke test** (Step 12). When it passes end-to-end on test mode, swap to Stripe **live keys** and create a **live-mode webhook**.
9. *(Optional)* Attach a **custom domain** and update both URL env vars + the Stripe webhook URL (Step 11).

> If you want to know exactly which env var is still blank, open Vercel → **Settings → Environment Variables** and compare against the table in Step 7. Anything not listed there is still missing.

---

## What you'll need before starting

- A laptop with a terminal (Mac Terminal, or Windows PowerShell)
- A credit card (free tiers work, but Stripe and the optional domain may charge)
- About **45 minutes** the first time
- These browser tabs open: <https://vercel.com> · <https://stripe.com> · <https://resend.com> · <https://github.com>

---

## Step 1 — GitHub repo

✅ **Already done** — the repo is live at <https://github.com/taylordrew4u2/COMEDYSUMMERCAMP>. Skip to Step 2.

If you ever need to re-link a fresh local clone:
```bash
git remote add origin https://github.com/taylordrew4u2/COMEDYSUMMERCAMP.git
git push -u origin main
```

**How to know it worked:** visiting <https://github.com/taylordrew4u2/COMEDYSUMMERCAMP> shows the code.

---

## Step 2 — Create the Vercel project

1. Go to <https://vercel.com/signup> and sign in with GitHub if you haven't.
2. Click **Add New… → Project**.
3. Find `COMEDYSUMMERCAMP` in the list. Click **Import**.
4. **CRITICAL — Set the Root Directory.**
   - Click **Edit** next to "Root Directory".
   - Click **Continue** to browse the repo.
   - Click `comedycampsplit` to select it.
   - Click **Continue**.
5. Vercel should now say **Framework Preset: Next.js**. If it says "Other", you picked the wrong root — go back and fix it.
6. **DO NOT click Deploy yet.** Leave this tab open. Continue to Step 3.

**How to know it worked:** the project page in Vercel shows "Framework: Next.js" and the project name `comedycampsplit`.

---

## Step 3 — Vercel Postgres database

Still in your Vercel project (don't deploy yet):

1. Click the **Storage** tab.
2. Click **Create Database** → choose **Postgres**.
3. Name it `comedysummercamp-db` (any name works).
4. Pick a region close to you (e.g. `iad1` for US East).
5. Click **Create**.
6. After it provisions, click **Connect Project** and pick your project. Confirm.

**How to know it worked:** go to **Settings → Environment Variables**. You should see `DATABASE_URL`, `POSTGRES_URL`, and a few related vars auto-added. **You did not type these — Vercel did.**

---

## Step 4 — Vercel Blob store

Same Storage tab:

1. Click **Create** → choose **Blob**.
2. Name it `comedysummercamp-blob`.
3. Click **Create**, then **Connect Project**.

**How to know it worked:** in **Settings → Environment Variables** you now also see `BLOB_READ_WRITE_TOKEN`.

---

## Step 5 — Stripe account + keys

1. Sign up at <https://stripe.com>.
2. **Stay in test mode** (toggle in top right says "Test mode"). Use test mode until everything works.
3. Go to <https://dashboard.stripe.com/test/apikeys>.
4. Copy the **Publishable key** (starts with `pk_test_…`) — paste into a notes app.
5. Click **Reveal test key** next to Secret key. Copy it (starts with `sk_test_…`) — paste into notes.

> **You'll switch to live keys (`pk_live_…` / `sk_live_…`) only after a successful test purchase.** Don't skip this — it lets you test with the fake card `4242 4242 4242 4242`.

**How to know it worked:** you have two strings copied that start with `pk_test_` and `sk_test_`.

---

## Step 6 — Resend account + sender domain

1. Sign up at <https://resend.com>.
2. **API Keys → Create API Key.** Name it `comedysummercamp`. Copy the key (starts with `re_…`) — paste into notes.
3. **Domains → Add Domain.** Enter the domain you want emails to come from (e.g. `comedysummercamp.com`). If you don't have one, see "No domain yet?" below.
4. Resend shows you DNS records (TXT, MX, CNAME). Open your DNS provider in a new tab.
5. Add **every record exactly as shown**. For most providers, the "Name" / "Host" field is the part *before* your domain (Resend will say "for `mail.comedysummercamp.com`" — you enter `mail` only).
6. Wait 5–30 minutes. Click **Verify** in Resend until it goes green.

**No domain yet?** You can ship with Resend's default sender `onboarding@resend.dev` and emails will work for testing — but real users will see them go to spam. Verify a domain before launch.

**How to know it worked:** the domain in Resend shows a green "Verified" badge.

---

## Step 7 — Paste environment variables into Vercel

Vercel project → **Settings → Environment Variables**. Add each row below for **all three environments** (Production, Preview, Development) unless noted.

| Variable | Value (where to get it) |
|---|---|
| `DATABASE_URL` | ✅ Already added by Step 3 — leave it alone |
| `BLOB_READ_WRITE_TOKEN` | ✅ Already added by Step 4 — leave it alone |
| `NEXTAUTH_SECRET` | Open a terminal on your laptop, run `openssl rand -base64 32`, paste the output |
| `NEXTAUTH_URL` | After first deploy this is your Vercel URL like `https://comedysummercamp.vercel.app`. **Set it to `https://placeholder.vercel.app` for now — you'll fix it after Step 8.** |
| `NEXT_PUBLIC_APP_URL` | Same value as `NEXTAUTH_URL` |
| `STRIPE_SECRET_KEY` | Your `sk_test_…` from Step 5 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Your `pk_test_…` from Step 5 |
| `STRIPE_WEBHOOK_SECRET` | **Leave blank for now.** You'll get this in Step 9. The build won't crash — Stripe is lazily initialized. |
| `RESEND_API_KEY` | Your `re_…` from Step 6 |
| `EMAIL_FROM` | The verified sender address, e.g. `Comedy Camp <noreply@comedysummercamp.com>` (or `onboarding@resend.dev` if no domain) |

**How to know it worked:** the env vars list shows all 10 entries (`STRIPE_WEBHOOK_SECRET` may be blank — that's fine for now).

---

## Step 8 — First deploy

1. In Vercel, click **Deployments → Redeploy** (or push a new commit if it hasn't deployed yet).
2. Watch the build logs.
3. Wait for **Ready** status with a green checkmark.

**Now copy your real Vercel URL** (e.g. `https://comedysummercamp-abc123.vercel.app`) and:
- Go back to **Settings → Environment Variables**
- Update `NEXTAUTH_URL` to that exact URL (no trailing slash)
- Update `NEXT_PUBLIC_APP_URL` to the same URL
- Click **Deployments → Redeploy** so the new values take effect

**How to know it worked:** visiting the URL redirects you to `/login`.

**If the build failed:**
| Error message | Fix |
|---|---|
| `prisma: command not found` | Root Directory is wrong → re-do Step 2 |
| `STRIPE_SECRET_KEY` missing | You skipped that env var in Step 7 |
| `Invalid prisma schema` | Schema in `comedycampsplit/prisma/schema.prisma` got corrupted; restore from git |
| `Module not found` | Click Redeploy and uncheck "Use existing build cache" |

---

## Step 9 — Stripe webhook

The app listens at `/api/webhooks/stripe`. Stripe needs to know to POST events there.

1. <https://dashboard.stripe.com/test/webhooks> → **Add endpoint**.
2. **Endpoint URL:** `https://<your-vercel-url>/api/webhooks/stripe` (use the URL from Step 8).
3. **Events to send** — click **Select events**, then check exactly these:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Click **Add endpoint**.
5. On the new endpoint's page, click **Reveal** next to "Signing secret". Copy it (starts with `whsec_…`).
6. Vercel → **Settings → Environment Variables** → edit `STRIPE_WEBHOOK_SECRET` → paste the value → save.
7. **Deployments → Redeploy.**

**How to know it worked:** in Stripe, send a test event (button on the endpoint page) → it shows **HTTP 200** in the webhook attempts table.

---

## Step 10 — Database schema + seed (do this from your laptop, ONCE)

Vercel doesn't run `prisma db push` automatically. You have to.

```bash
# On your laptop:
cd comedycampsplit
npm install

# Link this folder to the Vercel project, then download production env vars
npx vercel link
npx vercel env pull .env

# Create all the database tables
npx prisma db push

# Insert the trip row + admin user
npm run db:seed
```

**How to know it worked:** running `npx prisma studio` opens a browser showing tables (User, Trip, Expense, etc.) with at least the seeded admin user in `User`.

> **You only re-run `npx prisma db push` if `comedycampsplit/prisma/schema.prisma` changes.** You don't re-seed unless you wipe the database.

---

## Step 11 — (Optional) Custom domain

Skip this if you're fine with the `*.vercel.app` URL.

1. Vercel project → **Settings → Domains** → **Add**.
2. Type your domain. Vercel shows DNS records (A or CNAME).
3. At your DNS provider, add the records exactly as shown.
4. Wait for verification (a few minutes to a few hours).
5. Once Vercel marks the domain ✅, **update both `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL`** to the new domain. Redeploy.
6. **Update the Stripe webhook URL** (Step 9) to the new domain. Otherwise webhooks break.

**How to know it worked:** visiting your custom domain loads the app.

---

## Step 12 — Smoke test

Tick each item. If any fails, go to Troubleshooting.

- [ ] Visit your URL → redirects to `/login`
- [ ] Sign up a test participant → see "pending approval" state
- [ ] Log in to `/admin` (default Taylor / `weed69`) → approve the test user
- [ ] As the test user, see the dashboard, roster, itinerary
- [ ] Upload an avatar → confirm it appears (verifies Vercel Blob)
- [ ] Submit an expense with a receipt photo → upload works
- [ ] Lock the trip from `/admin/trip` → confirmation email arrives
- [ ] Pay via Stripe Checkout (test card `4242 4242 4242 4242`, any future date, any CVC) → status flips to **Confirmed & Paid**
- [ ] Stripe Dashboard → Webhooks → endpoint shows **succeeded** events (not 4xx/5xx)

**Once all of those pass**, switch from Stripe test keys to live keys:
1. Stripe → toggle off "Test mode".
2. Get your `pk_live_…` and `sk_live_…`.
3. Replace `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Vercel env vars.
4. Create a **new** webhook endpoint in live mode (Step 9 again, but on the live mode dashboard). Get a new `whsec_…` and update `STRIPE_WEBHOOK_SECRET`.
5. Redeploy.

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| Build fails with `prisma: command not found` | Root Directory in Vercel isn't `comedycampsplit` — Step 2 |
| Build fails about Stripe at build time | Should not happen — Stripe is lazily initialized. Make sure you didn't import `stripe` at module top in new code |
| Login loop / `NEXTAUTH_URL mismatch` | `NEXTAUTH_URL` doesn't match the URL you're visiting. Set it to the *exact* deployed URL (no trailing slash, https not http) and redeploy |
| Emails not arriving | Resend domain not verified, or `EMAIL_FROM` doesn't match the verified domain. Check Resend → Logs |
| Avatar/receipt upload fails | `BLOB_READ_WRITE_TOKEN` missing. Storage tab → reconnect Blob → Redeploy |
| Stripe webhook returns 400 | `STRIPE_WEBHOOK_SECRET` is wrong or you forgot to redeploy after setting it |
| Stripe webhook returns 500 | Check Vercel function logs: Vercel project → **Logs** → filter `/api/webhooks/stripe` |
| `prisma db push` errors | `npx vercel env pull .env` again to refresh `DATABASE_URL` |
| Database is empty after seed | You ran `db:seed` against your laptop's local DB, not Vercel's. Make sure `.env` came from `vercel env pull` |

---

## Local development

See [`comedycampsplit/README.md`](./comedycampsplit/README.md) for running locally with `npm run dev`.

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
└── README.md               ← you are here
```

---

## Need help?

If a step fails and the Troubleshooting table doesn't cover it:
1. Screenshot the error
2. Note which step number you're on
3. Copy the last 30 lines of the Vercel build log (or browser console, whichever is failing)

That's enough info to debug almost anything.
