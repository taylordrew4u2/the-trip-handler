-- AlterTable
ALTER TABLE "GuestForm" ADD COLUMN     "noAlcoholAck" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "noDrugsAck" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "noSmokingAck" BOOLEAN NOT NULL DEFAULT false;

-- Forms that already agreed to the old combined sober-trip check agreed to
-- no alcohol and no drugs.
UPDATE "GuestForm" SET "noAlcoholAck" = true, "noDrugsAck" = true WHERE "substanceFreeAck" = true;

-- Trips that had the combined "sober" switch off keep alcohol and drugs off.
UPDATE "Trip"
SET "disabledSections" = array_cat(array_remove("disabledSections", 'sober'), ARRAY['alcohol', 'drugs'])
WHERE 'sober' = ANY("disabledSections");
