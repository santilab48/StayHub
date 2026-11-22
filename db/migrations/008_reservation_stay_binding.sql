-- Bind an accepted nightly reservation to exactly one stay, account and property.
-- The QR join request is an explicit owner-approved identity step at check-in.
ALTER TABLE stayhub.reservations
  ADD CONSTRAINT reservations_property_unit_identity UNIQUE(property_id,id,unit_id);

ALTER TABLE stayhub.stays
  ADD COLUMN reservation_id uuid;

ALTER TABLE stayhub.stays
  ADD CONSTRAINT stays_reservation_scope
  FOREIGN KEY(property_id,reservation_id,unit_id)
  REFERENCES stayhub.reservations(property_id,id,unit_id);

CREATE UNIQUE INDEX stays_one_stay_per_reservation
  ON stayhub.stays(reservation_id) WHERE reservation_id IS NOT NULL;

ALTER TABLE stayhub.reservations
  ADD CONSTRAINT reservations_property_guest_identity
  UNIQUE(property_id,id,unit_id,guest_account_id);

ALTER TABLE stayhub.stays
  ADD CONSTRAINT stays_reservation_guest_scope
  FOREIGN KEY(property_id,reservation_id,unit_id,account_id)
  REFERENCES stayhub.reservations(property_id,id,unit_id,guest_account_id);

CREATE INDEX stays_reservation_lookup ON stayhub.stays(property_id,reservation_id);
REVOKE ALL ON ALL TABLES IN SCHEMA stayhub FROM PUBLIC;
