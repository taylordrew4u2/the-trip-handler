-- Scope board comments to a trip.
--
-- The board had no trip column and the query had no filter, so every approved
-- member of every trip read and wrote one global stream. Adding the column
-- takes three steps rather than one, because the table already has rows:
--
--   1. add it nullable,
--   2. backfill each comment from its author's trip,
--   3. drop the rows that still have no trip, then make the column required.
--
-- Step 3 can only match a comment whose author has since left every trip.
-- Posting requires approval, and approval requires being on a trip, so such a
-- row is already unreachable from the UI — there is nowhere it could be shown.

DROP INDEX "Comment_createdAt_idx";

ALTER TABLE "Comment" ADD COLUMN "tripId" TEXT;

UPDATE "Comment" c
SET "tripId" = u."tripId"
FROM "User" u
WHERE u."id" = c."userId" AND u."tripId" IS NOT NULL;

DELETE FROM "Comment" WHERE "tripId" IS NULL;

ALTER TABLE "Comment" ALTER COLUMN "tripId" SET NOT NULL;

CREATE INDEX "Comment_tripId_createdAt_idx" ON "Comment"("tripId", "createdAt");

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
