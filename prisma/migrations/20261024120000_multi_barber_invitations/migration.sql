CREATE TABLE "BarberShopInvitation" (
  "id" TEXT NOT NULL,
  "barberShopId" TEXT NOT NULL,
  "barberId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BarberShopInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BarberShopInvitation_barberShopId_barberId_key"
  ON "BarberShopInvitation"("barberShopId", "barberId");
CREATE INDEX "BarberShopInvitation_barberId_idx"
  ON "BarberShopInvitation"("barberId");

ALTER TABLE "BarberShopInvitation" ADD CONSTRAINT "BarberShopInvitation_barberShopId_fkey"
  FOREIGN KEY ("barberShopId") REFERENCES "BarberShop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BarberShopInvitation" ADD CONSTRAINT "BarberShopInvitation_barberId_fkey"
  FOREIGN KEY ("barberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
