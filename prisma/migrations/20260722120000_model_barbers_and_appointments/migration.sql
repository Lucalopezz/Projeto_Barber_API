-- Existing owners retain ownership under the new, explicit role.
UPDATE "User"
SET "role" = 'owner'
WHERE "id" IN (
  SELECT "ownerId"
  FROM "BarberShop"
  WHERE "ownerId" IS NOT NULL
);

-- Preserve monetary precision for service prices.
ALTER TABLE "Service"
ALTER COLUMN "price" SET DATA TYPE DECIMAL(10, 2)
USING "price"::DECIMAL(10, 2);

-- A user may own more than one barbershop, and every barbershop needs an owner.
DROP INDEX "BarberShop_ownerId_key";
ALTER TABLE "BarberShop" ALTER COLUMN "ownerId" SET NOT NULL;

-- Appointments are assigned to a professional. Existing appointments are assigned
-- to the owner of the barbershop that previously stored the appointment.
ALTER TABLE "Appointment" ADD COLUMN "barberId" TEXT;
UPDATE "Appointment" AS "appointment"
SET "barberId" = "barberShop"."ownerId"
FROM "BarberShop" AS "barberShop"
WHERE "appointment"."barberShopId" = "barberShop"."id";
ALTER TABLE "Appointment" ALTER COLUMN "barberId" SET NOT NULL;

-- Replace the old ownership, membership and appointment foreign keys.
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_barberShopId_fkey";
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_clientId_fkey";
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_serviceId_fkey";
ALTER TABLE "BarberShop" DROP CONSTRAINT "BarberShop_ownerId_fkey";
ALTER TABLE "User" DROP CONSTRAINT "User_barberShopId_fkey";

ALTER TABLE "Appointment" DROP COLUMN "barberShopId";

ALTER TABLE "User" ADD CONSTRAINT "User_barberShopId_fkey"
FOREIGN KEY ("barberShopId") REFERENCES "BarberShop"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BarberShop" ADD CONSTRAINT "BarberShop_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_barberId_fkey"
FOREIGN KEY ("barberId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Appointment_clientId_idx" ON "Appointment"("clientId");
CREATE INDEX "Appointment_barberId_idx" ON "Appointment"("barberId");
CREATE INDEX "Appointment_serviceId_idx" ON "Appointment"("serviceId");
CREATE INDEX "Appointment_barberId_date_idx" ON "Appointment"("barberId", "date");
