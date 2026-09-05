#!/usr/bin/env bash
#
# Apply pending Prisma migrations to the database this build is pointed at,
# and — only when explicitly asked — seed the demo trip.
#
# Migrations are normally just `prisma migrate deploy`. The one wrinkle is the
# very first deploy after migrating this project off `prisma db push`: the
# database already contains the schema but has no migration history, so
# `migrate deploy` fails with P3005 ("the database schema is not empty"). In
# that case we baseline the existing schema by marking the initial migration as
# already applied, then re-run deploy to pick up anything newer.
#
# This keeps deploys working for both a brand-new (empty) database and the
# existing production database, with no manual one-off step — and, by gating on
# P3005, it does NOT mask genuine migration failures.
set -uo pipefail

if output="$(npx prisma migrate deploy 2>&1)"; then
  echo "$output"
else
  echo "$output"

  if grep -q "P3005" <<<"$output"; then
    echo ">> Database has the schema but no migration history — baselining 0_init"
    npx prisma migrate resolve --applied 0_init
    npx prisma migrate deploy || exit 1
  else
    echo ">> migrate deploy failed for a reason other than P3005; aborting"
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# Optional demo seed.
#
# Off by default, because a build step that writes rows would otherwise run
# against whatever database it happens to be pointed at. Setting SEED_DEMO=true
# in the deployment's environment turns it on, which is how a hosted demo gets
# its data without anyone handing round a production connection string.
#
# Two things to know before turning it on, both consequences of it running on
# EVERY deploy rather than once:
#
#   * The seed is idempotent, so repeats don't duplicate anything.
#   * It rebuilds the demo trip's child records, so anything visitors created
#     on that trip — their board posts, their bed claims — is discarded on each
#     deploy. For a public demo that is usually the point: it resets itself.
#     For a database with real trips in it, it is not what you want. The seed
#     only ever touches its own trip, but leaving this on is still a standing
#     instruction to wipe that trip's contents regularly.
#
# A seed failure fails the build. A deploy whose demo silently didn't seed is
# worse than one that stops and says so.
# ---------------------------------------------------------------------------
if [[ "${SEED_DEMO:-}" == "true" ]]; then
  echo ">> SEED_DEMO=true — seeding the demo trip"
  npm run db:seed || {
    echo ">> demo seed failed; failing the build rather than deploying an empty demo"
    exit 1
  }
else
  echo ">> SEED_DEMO not set — skipping the demo seed (see docs/seeding-the-demo.md)"
fi
