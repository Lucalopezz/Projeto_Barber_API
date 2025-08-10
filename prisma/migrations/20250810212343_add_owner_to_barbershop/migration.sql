/*
  Warnings:

  - A unique constraint covering the columns `[ownerId]` on the table `BarberShop` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BarberShop" ADD COLUMN     "ownerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BarberShop_ownerId_key" ON "BarberShop"("ownerId");

-- AddForeignKey
ALTER TABLE "BarberShop" ADD CONSTRAINT "BarberShop_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
