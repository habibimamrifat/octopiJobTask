-- CreateTable
CREATE TABLE "PendingOrganizationRegistration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "billingEmail" TEXT,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userPassword" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "stripeCheckoutId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingOrganizationRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingOrganizationRegistration_stripeCheckoutId_key" ON "PendingOrganizationRegistration"("stripeCheckoutId");

-- CreateIndex
CREATE INDEX "PendingOrganizationRegistration_userEmail_idx" ON "PendingOrganizationRegistration"("userEmail");

-- CreateIndex
CREATE INDEX "PendingOrganizationRegistration_packageId_idx" ON "PendingOrganizationRegistration"("packageId");

-- AddForeignKey
ALTER TABLE "PendingOrganizationRegistration" ADD CONSTRAINT "PendingOrganizationRegistration_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SubscriptionPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
