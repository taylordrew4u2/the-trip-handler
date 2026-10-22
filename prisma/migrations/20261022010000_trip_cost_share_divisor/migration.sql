ALTER TABLE "Trip" ADD COLUMN "costShareDivisor" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_costShareDivisor_positive" CHECK ("costShareDivisor" > 0);
