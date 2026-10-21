-- AlterTable
ALTER TABLE "User" ADD COLUMN     "priceAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "priceAdjustmentNote" TEXT;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "showLineItems" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showBedPrices" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showPersonalAdjustment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Bed" ADD COLUMN     "priceAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 75,
ADD COLUMN     "venmoHandle" TEXT,
ADD COLUMN     "cashAppHandle" TEXT;

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'VENMO', 'CASH_APP');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "method" "PaymentMethod" NOT NULL DEFAULT 'STRIPE',
ADD COLUMN     "receiptUrl" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3);
