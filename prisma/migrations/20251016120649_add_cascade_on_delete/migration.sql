-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT "Service_barberShopId_fkey";

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_barberShopId_fkey" FOREIGN KEY ("barberShopId") REFERENCES "BarberShop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
