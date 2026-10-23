ALTER TABLE "Trip" ADD COLUMN "rosterCapacity" INTEGER NOT NULL DEFAULT 13;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_rosterCapacity_range" CHECK ("rosterCapacity" BETWEEN 1 AND 1000);
