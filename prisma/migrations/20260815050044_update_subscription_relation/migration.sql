/*
  Warnings:

  - A unique constraint covering the columns `[stripePriceId]` on the table `SubscriptionPackage` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SubscriptionPackage" ADD COLUMN     "stripePriceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPackage_stripePriceId_key" ON "SubscriptionPackage"("stripePriceId");
