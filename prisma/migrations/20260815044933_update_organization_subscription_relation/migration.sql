-- DropIndex
DROP INDEX "OrganizationSubscription_organizationId_key";

-- CreateIndex
CREATE INDEX "OrganizationSubscription_organizationId_idx" ON "OrganizationSubscription"("organizationId");
