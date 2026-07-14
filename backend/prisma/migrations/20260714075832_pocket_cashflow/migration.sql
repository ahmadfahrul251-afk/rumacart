/*
  Warnings:

  - You are about to drop the column `profitFirstOpex` on the `cashflow` table. All the data in the column will be lost.
  - You are about to drop the column `profitFirstOwnerPay` on the `cashflow` table. All the data in the column will be lost.
  - You are about to drop the column `profitFirstProfit` on the `cashflow` table. All the data in the column will be lost.
  - You are about to drop the column `profitFirstTax` on the `cashflow` table. All the data in the column will be lost.
  - You are about to drop the `profit_first_settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CashflowPocket" AS ENUM ('INVESTASI', 'INVENTARIS', 'PROFIT');

-- AlterTable
ALTER TABLE "cashflow" DROP COLUMN "profitFirstOpex",
DROP COLUMN "profitFirstOwnerPay",
DROP COLUMN "profitFirstProfit",
DROP COLUMN "profitFirstTax",
ADD COLUMN     "pocket" "CashflowPocket";

-- DropTable
DROP TABLE "profit_first_settings";
