-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'appointment_updated';
ALTER TYPE "NotificationType" ADD VALUE 'appointment_cancelled';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "previousServiceName" TEXT,
ADD COLUMN     "previousStartsAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "NotificationOutbox" ADD COLUMN     "previousServiceName" TEXT,
ADD COLUMN     "previousStartsAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
