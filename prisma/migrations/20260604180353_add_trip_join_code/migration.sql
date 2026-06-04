-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "joinCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Trip_joinCode_key" ON "Trip"("joinCode");

