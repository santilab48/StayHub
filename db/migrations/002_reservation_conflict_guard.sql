-- Block overlapping confirmed/checked-in reservations of the same physical unit.
-- Does not yet handle whole-property inventory overlapping its constituent rooms.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE stayhub.reservations
  ADD CONSTRAINT reservations_no_active_overlap
  EXCLUDE USING gist (
    unit_id WITH =,
    daterange(arrival_date, departure_date, '[)') WITH &&
  )
  WHERE (status IN ('confirmed', 'checked_in'));
