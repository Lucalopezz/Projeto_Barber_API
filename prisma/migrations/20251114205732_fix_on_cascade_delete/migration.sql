-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_barberShopId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "BarberShop" DROP CONSTRAINT "BarberShop_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_barberShopId_fkey";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_barberShopId_fkey" FOREIGN KEY ("barberShopId") REFERENCES "BarberShop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarberShop" ADD CONSTRAINT "BarberShop_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_barberShopId_fkey" FOREIGN KEY ("barberShopId") REFERENCES "BarberShop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
