ALTER TABLE "Appointment" ADD COLUMN "barberShopId" TEXT;

UPDATE "Appointment" AS "appointment"
SET "barberShopId" = "service"."barberShopId"
FROM "Service" AS "service"
WHERE "appointment"."serviceId" = "service"."id";

ALTER TABLE "Appointment" ALTER COLUMN "barberShopId" SET NOT NULL;

CREATE INDEX "Appointment_barberShopId_idx" ON "Appointment"("barberShopId");

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_barberShopId_fkey"
FOREIGN KEY ("barberShopId") REFERENCES "BarberShop"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
