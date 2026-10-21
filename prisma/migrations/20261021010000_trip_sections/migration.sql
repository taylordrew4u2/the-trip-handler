-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "disabledSections" TEXT[] DEFAULT ARRAY[]::TEXT[];
