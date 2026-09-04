# Stripe webhook: setup and verification

The webhook is the only thing in this app that can mark someone paid. The
`success_url` redirect after Checkout is cosmetic — a member who navigates
straight to it still sees "unpaid", by design. So getting the webhook right is
getting payment right.

---

## What the app needs

```
STRIPE_SECRET_KEY=sk_...         # lib/stripe.ts
STRIPE_WEBHOOK_SECRET=whsec_...  # app/api/webhooks/stripe/route.ts
NEXT_PUBLIC_APP_URL=https://...  # success/cancel redirects; must be absolute
```

- **Endpoint:** `POST /api/webhooks/stripe`
- **The only event that does anything:** `checkout.session.completed`. Anything
  else gets a `200 {received:true}` and is ignored, which is all Stripe needs.
- **No publishable key.** Checkout sessions are created server-side in
  `createCheckoutSession` and the browser is redirected to `checkout.url`; there
  is no browser SDK.
- The handler keys off `session.metadata.userId`, set when the session is
  created. If a payment succeeds but nobody's status changes, that missing
  metadata is the first thing to check.

---

## 1. Test mode, locally

Stripe cannot reach `localhost`, so the CLI forwards for it.

```bash
brew install stripe/stripe-cli/stripe   # or see stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

`stripe listen` prints a signing secret. **It belongs to that CLI session and is
not the same as any endpoint secret in the dashboard.** Put it in `.env.local`
alongside a test-mode secret key, then restart the dev server — `getStripe()`
caches a singleton and Next reads `.env` only at boot.

## 2. Get the app into a payable state

`createCheckoutSession` refuses early unless all of this holds:

1. You're signed in as a participant, not the legacy ADMIN seat.
2. You're an approved member of a trip.
3. That trip has `isLocked = true` and a non-null `finalPrice`.

Locking isn't one button. As the trip owner, open
`/dashboard/my-trips/<id>`, set all three cost lines (housing, transport,
meals) and lock each. Locking the third computes the per-person share, locks
the trip, and moves every approved member to `PENDING_PAYMENT`
(`app/actions/trips.ts`). Only then does `/dashboard/payment` offer a working
pay button.

## 3. Drive a real round trip

Pay with `4242 4242 4242 4242`, any future expiry, any CVC.

Watch the `stripe listen` terminal for `checkout.session.completed` followed by
`200 POST /api/webhooks/stripe`. A `400` means signature verification failed —
wrong `whsec_`, or the server didn't restart.

A 200 is not proof the write landed. Check:

```bash
psql "$DATABASE_URL" -c 'select status, "stripePaymentId" from "Payment" order by "createdAt" desc limit 1;'
psql "$DATABASE_URL" -c $'select email, status from "User" where email = \'…\';'
```

You want `Payment.status = COMPLETED` with a non-null `stripePaymentId`, and
`User.status = CONFIRMED_PAID`.

`stripe trigger checkout.session.completed` fires a synthetic event with **no**
`metadata.userId`, so the handler verifies the signature and then does nothing.
It proves the signature path, not the business logic. Use a real Checkout run
for that; `stripe events resend evt_…` replays one.

## 4. A deployed endpoint

Deploy first — the URL must be public and HTTPS.

1. Dashboard → Developers → Webhooks → **Add endpoint**.
2. URL: `https://your-domain/api/webhooks/stripe`.
3. Select **`checkout.session.completed`** only. Subscribing to everything just
   pays attention costs for events the handler ignores.
4. Reveal the signing secret — a different `whsec_…` from the CLI's — and set it
   in the host's environment along with the secret key and `NEXT_PUBLIC_APP_URL`.
5. **Redeploy.** New environment variables do not apply to an existing deployment.
6. Run a test payment. The endpoint's page lists every delivery with request and
   response bodies; that's the log when something 400s.

## 5. Live mode

Live mode has its own API keys *and* its own webhook endpoints. A test-mode
endpoint receives zero live events, and a test `whsec_` rejects every live
signature.

1. Activate the Stripe account (business details, bank account, identity).
2. Switch the dashboard out of test mode and repeat step 4 from scratch.
3. Swap in `sk_live_…` and the live endpoint's secret. Redeploy.
4. Make one real payment for the smallest amount you can arrange, confirm the
   status flips, then refund it.

---

## Things that bite

- **Never parse the body before verifying.** The route reads `request.text()` on
  purpose; the signature covers the exact raw bytes. Middleware that rewrites
  the body breaks verification.
- **Retries.** Stripe retries non-2xx for about three days. This handler is safe
  to replay: the `updateMany` on session id and the user-status update are both
  idempotent.
- **A missing `STRIPE_WEBHOOK_SECRET` returns 500**, so Stripe will retry against
  a misconfigured deploy indefinitely. Check the delivery log after any
  environment change.
- **Rotating the secret** invalidates the old one immediately. Update the
  environment and redeploy in the same window.
