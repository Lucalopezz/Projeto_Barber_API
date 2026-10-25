-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('appointment_created');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "serviceName" TEXT NOT NULL,
    "barberShopName" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMPTZ(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "recipientIds" TEXT[],
    "serviceName" TEXT NOT NULL,
    "barberShopName" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(3),

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_id_idx" ON "Notification"("userId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Notification_appointmentId_idx" ON "Notification"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_eventKey_userId_key" ON "Notification"("eventKey", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationOutbox_eventKey_key" ON "NotificationOutbox"("eventKey");

-- CreateIndex
CREATE INDEX "NotificationOutbox_processedAt_id_idx" ON "NotificationOutbox"("processedAt", "id");

-- CreateIndex
CREATE INDEX "NotificationOutbox_appointmentId_idx" ON "NotificationOutbox"("appointmentId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

