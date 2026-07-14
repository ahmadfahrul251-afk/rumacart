-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('RDH', 'MART', 'POINT');

-- AlterTable
ALTER TABLE "fulfillment_points" ADD COLUMN     "operatingHours" TEXT,
ADD COLUMN     "parentHubId" TEXT,
ADD COLUMN     "serviceRadiusKm" DOUBLE PRECISION,
ADD COLUMN     "type" "LocationType" NOT NULL DEFAULT 'POINT';

-- AddForeignKey
ALTER TABLE "fulfillment_points" ADD CONSTRAINT "fulfillment_points_parentHubId_fkey" FOREIGN KEY ("parentHubId") REFERENCES "fulfillment_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;
