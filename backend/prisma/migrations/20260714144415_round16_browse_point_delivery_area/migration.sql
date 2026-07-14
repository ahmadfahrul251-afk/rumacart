/*
  Warnings:

  - The values [INSTANT,SAME_DAY] on the enum `ShippingMethod` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "RestockRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryMoveType" ADD VALUE 'RETURN';
ALTER TYPE "InventoryMoveType" ADD VALUE 'DAMAGE';
ALTER TYPE "InventoryMoveType" ADD VALUE 'EXPIRED';

-- AlterEnum
BEGIN;
CREATE TYPE "ShippingMethod_new" AS ENUM ('PICKUP', 'DELIVERY');
ALTER TABLE "orders" ALTER COLUMN "shippingMethod" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "shippingMethod" TYPE "ShippingMethod_new" USING ("shippingMethod"::text::"ShippingMethod_new");
ALTER TYPE "ShippingMethod" RENAME TO "ShippingMethod_old";
ALTER TYPE "ShippingMethod_new" RENAME TO "ShippingMethod";
DROP TYPE "ShippingMethod_old";
ALTER TABLE "orders" ALTER COLUMN "shippingMethod" SET DEFAULT 'PICKUP';
COMMIT;

-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "kecamatan" TEXT;

-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "maxStock" INTEGER,
ADD COLUMN     "safetyStock" INTEGER;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "isBackOrder" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "stock_transfers" ADD COLUMN     "fromPointId" TEXT;

-- CreateTable
CREATE TABLE "delivery_areas" (
    "id" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "kecamatan" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restock_requests" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "status" "RestockRequestStatus" NOT NULL DEFAULT 'PENDING',
    "sourceHubId" TEXT,
    "isAuto" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "transferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),

    CONSTRAINT "restock_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_areas_pointId_kecamatan_city_key" ON "delivery_areas"("pointId", "kecamatan", "city");

-- CreateIndex
CREATE UNIQUE INDEX "restock_requests_requestNumber_key" ON "restock_requests"("requestNumber");

-- AddForeignKey
ALTER TABLE "delivery_areas" ADD CONSTRAINT "delivery_areas_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "fulfillment_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_fromPointId_fkey" FOREIGN KEY ("fromPointId") REFERENCES "fulfillment_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restock_requests" ADD CONSTRAINT "restock_requests_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "fulfillment_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restock_requests" ADD CONSTRAINT "restock_requests_sourceHubId_fkey" FOREIGN KEY ("sourceHubId") REFERENCES "fulfillment_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restock_requests" ADD CONSTRAINT "restock_requests_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
