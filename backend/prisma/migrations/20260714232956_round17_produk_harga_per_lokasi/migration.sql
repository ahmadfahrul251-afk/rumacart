/*
  Warnings:

  - You are about to drop the column `costPrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `discountPrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `sellPrice` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "basePrice" INTEGER,
ADD COLUMN     "discountPrice" INTEGER,
ADD COLUMN     "sellPrice" INTEGER;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "costPrice",
DROP COLUMN "discountPrice",
DROP COLUMN "sellPrice",
ADD COLUMN     "heightCm" DOUBLE PRECISION,
ADD COLUMN     "lengthCm" DOUBLE PRECISION,
ADD COLUMN     "searchKeywords" TEXT,
ADD COLUMN     "widthCm" DOUBLE PRECISION;
