-- CreateEnum
CREATE TYPE "VoucherDiscountType" AS ENUM ('FLAT', 'PERCENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER', 'PROMO', 'SYSTEM');

-- AlterTable
ALTER TABLE "cashflow" ADD COLUMN     "costAmount" INTEGER,
ADD COLUMN     "profitAmount" INTEGER;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "belowCost" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "costTotal" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "vouchers" ADD COLUMN     "discountType" "VoucherDiscountType" NOT NULL DEFAULT 'FLAT',
ADD COLUMN     "maxDiscount" INTEGER;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "refId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
