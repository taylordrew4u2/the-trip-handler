-- Written to be safe to re-run: an earlier copy of this migration (named
-- 20261023000000_stored_files) was applied to a shared database by a preview
-- build before it was renamed to run after the roster-capacity migration.

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CASH';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'OTHER';

-- CreateTable
CREATE TABLE IF NOT EXISTS "StoredFile" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "uploaderId" TEXT,
    "tripId" TEXT,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StoredFile_tripId_idx" ON "StoredFile"("tripId");
