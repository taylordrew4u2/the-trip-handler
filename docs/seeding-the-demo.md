# Seeding the demo trip

The README points at a live demo. That link is only worth following if the
database behind it has the demo trip in it — otherwise a visitor lands on a
login screen with no way in except creating an account and starting from an
empty trip, and none of the screenshots in the README correspond to anything
they can reach.

Seeding is **off by default** during a deploy, and deliberately so: a build
step that writes rows unconditionally would run against whatever database it
happened to be pointed at. It is opt-in instead — one environment variable —
so a hosted demo can get its data without anyone passing round a production
connection string.

---

## What the seed creates

`prisma/seed.ts` builds one trip, *Demo Cabin Weekend*, dated a month out so it
always reads as upcoming:

| | |
|---|---|
| Organizer | `demo@thetriphandler.app` / `demo1234` — owns the trip *and* is on it, so this account sees both the owner tooling and every member page |
| Approved member | `alex@example.com` / `demo1234` — the member's-eye view |
| Rest of the roster | Jordan Lee (confirmed paid), Morgan Diaz (approved), Sam Chen (pending, so the applicant queue isn't empty) |
| Join code | `TAHOE` |
| Invite link | `/join/demo-invite-token` |

Sign in as the organizer to show the whole product; as Alex to show what a
participant sees. Signing in as Sam shows the read-only `PENDING` state.

Plus a 3-day itinerary, a meal poll mid-vote with ideas and votes cast, four
board posts with reactions, a contributions board with sign-ups, logged
expenses, and four beds with two already claimed.

It is idempotent. Accounts and the trip upsert by their unique keys, and the
trip's child records are deleted and rebuilt, so running it twice does not
duplicate anything.

**These are published credentials.** Anyone who reads this repository can sign
in as the organizer. That is the point of a demo, but it means the seeded trip
should never share a database with anything real, and the demo accounts should
never be given a role beyond `PARTICIPANT`.

---

## Seeding a deployed database

Two ways. The first needs nothing but a dashboard.

### Option A — set `SEED_DEMO` and redeploy (recommended)

Add an environment variable to the deployment and trigger a redeploy:

```
SEED_DEMO=true
```

`scripts/db-deploy.sh` runs on every build. With that variable set to exactly
`true` it runs the seed after migrations; with it unset, or set to anything
else, it skips and says so in the build log. A seed failure fails the build,
because a deploy that quietly shipped an empty demo is worse than one that
stops.

Two consequences of it running on *every* deploy, both worth understanding
before you leave it on:

- The seed is idempotent, so repeats don't duplicate anything.
- It rebuilds the demo trip's child records, so anything visitors created on
  that trip — their board posts, their bed claims — is discarded each time you
  deploy. For a public demo that is usually the point: it heals itself. On a
  database with real trips in it, it is not what you want. The seed only ever
  touches its own trip, but leaving the flag on is a standing instruction to
  wipe that trip's contents regularly.

Once the demo is seeded and you don't want it reset on every deploy, remove the
variable. The data stays; only the rebuilding stops.

### Option B — run it once, by hand

Useful when you want to seed without a deploy, or want to watch it happen. You
need the database's connection string — on Vercel, Project → Settings →
Environment Variables → `DATABASE_URL` (or `vercel env pull`). Run it from a
checkout of the commit that is deployed, so the seed matches the schema:

```bash
git checkout main && git pull
npm ci
npx prisma generate

# Point at the deployed database for this command only — do not export it into
# your shell, or the next npm run db:* will hit production by accident.
DATABASE_URL='postgresql://…' npx prisma migrate status   # confirm it is up to date
DATABASE_URL='postgresql://…' npm run db:seed
```

`migrate status` first is worth the extra step: seeding against a database
missing a migration fails partway through and leaves the trip half-built.

### Verifying either way

Check it from the outside, rather than trusting the command's output.
**A 200 proves nothing here**: when the token doesn't resolve, the invite page
still returns 200 and renders "This invite isn't active". Assert on content
instead, and on something only present on success — the trip's name:

```bash
curl -s https://your-domain/join/demo-invite-token | grep -c 'Demo Cabin Weekend'   # want > 0
```

Grepping for the failure text instead is a trap: React escapes the apostrophe
in the rendered HTML but not in the streamed payload, so `"isn't active"` and
`"isn&#x27;t active"` both appear and a naive match is unreliable.

Finally, sign in as `alex@example.com` and confirm the dashboard shows the trip.

---

## Re-seeding later

Safe to re-run at any time; it rebuilds the trip's child records in place. Two
things to know:

- Anything **visitors** created on the demo trip — their board posts, their bed
  claims — is wiped along with the seeded rows. That is usually what you want
  for a demo, but it is a real delete.
- Accounts visitors signed up with are **not** touched. They accumulate. If the
  demo is public, expect the user table to grow; `npm run db:remove-orphaned-trips`
  clears trips left behind with no owner.

---

## Related: `NEXTAUTH_URL`

**On Vercel you no longer need to set this, and setting it has no effect.**

NextAuth v4 trusts `NEXTAUTH_URL` unconditionally when it is present, with no
check that it matches the host the request arrived on. That makes a stale value
silently wrong rather than loudly broken — this project ran for a while with it
pointing at an unrelated project's domain, and nothing complained. A fixed
value is also wrong by construction on preview deployments, which each get
their own hostname.

So `lib/authOrigin.ts` drops the variable when running on Vercel and lets
NextAuth derive the origin from the request's own `x-forwarded-host`, which is
right for production and for every preview and cannot drift. You can delete
`NEXTAUTH_URL` from the Vercel project; leaving it set does no harm either.

Off Vercel — local development, CI, any other host — nothing changed:
`NEXTAUTH_URL` is still required and still honoured, because there is no
trusted host to fall back to.

To read back what a deployment thinks it is:

```bash
curl -s https://your-domain/api/auth/providers
```

`signinUrl` and `callbackUrl` should both be on the domain you requested.
