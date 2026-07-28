-- Appointment dates are instants. Existing values were written as UTC and are
-- therefore explicitly interpreted as UTC while changing to timestamptz.
ALTER TABLE "BarberShop"
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

ALTER TABLE "Appointment"
ADD COLUMN "endDate" TIMESTAMP(3);

UPDATE "Appointment" AS appointment
SET "endDate" = appointment."date" + (service."duration" * INTERVAL '1 minute')
FROM "Service" AS service
WHERE appointment."serviceId" = service."id";

ALTER TABLE "Appointment"
ALTER COLUMN "endDate" SET NOT NULL;

ALTER TABLE "Appointment"
ALTER COLUMN "date" TYPE TIMESTAMPTZ(3) USING "date" AT TIME ZONE 'UTC',
ALTER COLUMN "endDate" TYPE TIMESTAMPTZ(3) USING "endDate" AT TIME ZONE 'UTC';

CREATE TABLE "BarberSchedule" (
    "id" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,

    CONSTRAINT "BarberSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BarberTimeOff" (
    "id" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "BarberTimeOff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BarberSchedule_barberId_dayOfWeek_startMinute_endMinute_key"
ON "BarberSchedule"("barberId", "dayOfWeek", "startMinute", "endMinute");
CREATE INDEX "BarberSchedule_barberId_dayOfWeek_idx"
ON "BarberSchedule"("barberId", "dayOfWeek");
CREATE INDEX "BarberTimeOff_barberId_startsAt_endsAt_idx"
ON "BarberTimeOff"("barberId", "startsAt", "endsAt");

ALTER TABLE "BarberSchedule"
ADD CONSTRAINT "BarberSchedule_barberId_fkey"
FOREIGN KEY ("barberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BarberTimeOff"
ADD CONSTRAINT "BarberTimeOff_barberId_fkey"
FOREIGN KEY ("barberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BarberSchedule"
ADD CONSTRAINT "BarberSchedule_valid_window_check"
CHECK ("dayOfWeek" BETWEEN 0 AND 6 AND "startMinute" >= 0 AND "endMinute" <= 1440 AND "startMinute" < "endMinute");

ALTER TABLE "BarberTimeOff"
ADD CONSTRAINT "BarberTimeOff_valid_window_check"
CHECK ("startsAt" < "endsAt");

DROP INDEX "Appointment_barberId_date_idx";

CREATE INDEX "Appointment_barberId_date_endDate_idx"
ON "Appointment"("barberId", "date", "endDate");
