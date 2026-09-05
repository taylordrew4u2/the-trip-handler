# Seeding the demo trip

The README points at a live demo. That link is only worth following if the
database behind it has the demo trip in it — otherwise a visitor lands on a
login screen with no way in except creating an account and starting from an
empty trip, and none of the screenshots in the README correspond to anything
they can reach.

Seeding is **not** part of the deploy, and deliberately so: `npm run build`
runs `scripts/db-deploy.sh`, which applies migrations and nothing else. A build
step that writes demo rows would run on every deploy, against whatever database
it is pointed at. So seeding the deployed database is a manual, one-time step.

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

You need the database's connection string — on Vercel, Project → Settings →
Environment Variables → `DATABASE_URL` (or `vercel env pull`). Run this from a
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

Then check it from the outside, rather than trusting the command's output.
**A 200 proves nothing here**: when the token doesn't resolve, the invite page
still returns 200 and renders "This invite isn't active". Assert on content
instead, and assert on something that is only present on success — the trip's
name:

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

While you are in the environment variables, check `NEXTAUTH_URL`. It must be
the origin the app is actually served from, with no trailing slash:

```
NEXTAUTH_URL=https://the-trip-handler.vercel.app
```

If it points somewhere else, every URL NextAuth generates — sign-in, callback,
error redirects — sends users to that other origin. You can read back what the
deployed app thinks it is:

```bash
curl -s https://your-domain/api/auth/providers
```

The `signinUrl` and `callbackUrl` in the response should both be on your
domain. Changing the variable requires a **redeploy**; Vercel does not apply
new environment variables to an existing deployment.
