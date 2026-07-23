ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "BarberShop" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Service" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Appointment" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
