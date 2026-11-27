-- Additive metadata for guesthouse rooms; other property types are unchanged.
ALTER TABLE stayhub.units ADD COLUMN IF NOT EXISTS room_details jsonb;
ALTER TABLE stayhub.units ADD CONSTRAINT units_room_details_object CHECK (room_details IS NULL OR jsonb_typeof(room_details)='object');
