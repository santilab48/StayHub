-- Additive reservation metadata; existing bookings remain valid.
ALTER TABLE stayhub.reservations ADD COLUMN IF NOT EXISTS booking_details jsonb;
ALTER TABLE stayhub.reservations ADD CONSTRAINT reservations_booking_details_object CHECK (booking_details IS NULL OR jsonb_typeof(booking_details)='object');
