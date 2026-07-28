-- The application check provides a friendly error, while this exclusion
-- constraint is the final protection against two concurrent requests booking
-- overlapping intervals for the same barber.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_no_overlapping_scheduled"
EXCLUDE USING GIST (
  "barberId" WITH =,
  tstzrange("date", "endDate", '[)') WITH &&
)
WHERE ("status" = 'scheduled');
