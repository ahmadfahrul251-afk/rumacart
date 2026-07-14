-- AlterTable
ALTER TABLE "cashflow" ADD COLUMN     "profitFirstOpex" INTEGER,
ADD COLUMN     "profitFirstOwnerPay" INTEGER,
ADD COLUMN     "profitFirstProfit" INTEGER,
ADD COLUMN     "profitFirstTax" INTEGER;

-- CreateTable
CREATE TABLE "profit_first_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "profitPercent" INTEGER NOT NULL DEFAULT 5,
    "ownerPayPercent" INTEGER NOT NULL DEFAULT 50,
    "taxPercent" INTEGER NOT NULL DEFAULT 15,
    "opexPercent" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profit_first_settings_pkey" PRIMARY KEY ("id")
);
