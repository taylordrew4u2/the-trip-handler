#!/usr/bin/env bash
#
# Apply pending Prisma migrations to the database this build is pointed at.
#
# Normally this is just `prisma migrate deploy`. The one wrinkle is the very
# first deploy after migrating this project off `prisma db push`: the database
# already contains the schema but has no migration history, so `migrate deploy`
# fails with P3005 ("the database schema is not empty"). In that case we
# baseline the existing schema by marking the initial migration as already
# applied, then re-run deploy to pick up anything newer.
#
# This keeps deploys working for both a brand-new (empty) database and the
# existing production database, with no manual one-off step — and, by gating on
# P3005, it does NOT mask genuine migration failures.
set -uo pipefail

if output="$(npx prisma migrate deploy 2>&1)"; then
  echo "$output"
  exit 0
fi

echo "$output"

if grep -q "P3005" <<<"$output"; then
  echo ">> Database has the schema but no migration history — baselining 0_init"
  npx prisma migrate resolve --applied 0_init
  npx prisma migrate deploy
else
  echo ">> migrate deploy failed for a reason other than P3005; aborting"
  exit 1
fi
