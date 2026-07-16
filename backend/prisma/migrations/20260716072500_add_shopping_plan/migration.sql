-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REMINDER';

-- CreateTable
CREATE TABLE "shopping_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Belanja Bulanan',
    "checkoutDay" INTEGER NOT NULL DEFAULT 1,
    "reminderOffsetDays" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastReminderSentAt" TIMESTAMP(3),
    "lastCheckoutPromptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_plan_items" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shopping_plan_items_planId_variantId_key" ON "shopping_plan_items"("planId", "variantId");

-- AddForeignKey
ALTER TABLE "shopping_plans" ADD CONSTRAINT "shopping_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_plan_items" ADD CONSTRAINT "shopping_plan_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "shopping_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_plan_items" ADD CONSTRAINT "shopping_plan_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
