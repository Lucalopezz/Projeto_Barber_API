-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'appointment_reminder';

-- AlterTable
ALTER TABLE "NotificationOutbox" ADD COLUMN     "appointmentVersion" INTEGER;

-- CreateIndex
CREATE INDEX "Appointment_status_date_id_idx" ON "Appointment"("status", "date", "id");
