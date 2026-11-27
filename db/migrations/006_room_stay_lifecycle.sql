-- P2.2 room occupancy lifecycle, property-scoped movement audit, housekeeping.
-- No personal documents or legacy Supabase records copied.
ALTER TABLE stayhub.stays ADD CONSTRAINT stays_property_id_unique UNIQUE (property_id,id);

CREATE TABLE IF NOT EXISTS stayhub.unit_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text NOT NULL CHECK(reason IN ('maintenance','owner_hold','other')),
  created_by uuid NOT NULL REFERENCES stayhub.accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(ends_at>starts_at),
  CONSTRAINT unit_blocks_unit_scope FOREIGN KEY(property_id,unit_id)
    REFERENCES stayhub.units(property_id,id)
);
CREATE INDEX IF NOT EXISTS unit_blocks_lookup
  ON stayhub.unit_blocks(property_id,unit_id,starts_at,ends_at);

CREATE TABLE IF NOT EXISTS stayhub.housekeeping_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','in_progress','ready','cancelled')),
  triggered_by_stay_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT housekeeping_unit_scope FOREIGN KEY(property_id,unit_id)
    REFERENCES stayhub.units(property_id,id),
  CONSTRAINT housekeeping_stay_scope FOREIGN KEY(property_id,triggered_by_stay_id)
    REFERENCES stayhub.stays(property_id,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS housekeeping_one_open_per_unit
  ON stayhub.housekeeping_tasks(property_id,unit_id)
  WHERE status IN ('pending','in_progress');

CREATE TABLE IF NOT EXISTS stayhub.stay_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES stayhub.properties(id),
  stay_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES stayhub.accounts(id),
  actor_account_id uuid NOT NULL REFERENCES stayhub.accounts(id),
  event_type text NOT NULL CHECK(event_type IN ('approved','checked_out','transferred')),
  from_unit_id uuid,
  to_unit_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stay_events_stay_scope FOREIGN KEY(property_id,stay_id)
    REFERENCES stayhub.stays(property_id,id),
  CONSTRAINT stay_events_from_unit_scope FOREIGN KEY(property_id,from_unit_id)
    REFERENCES stayhub.units(property_id,id),
  CONSTRAINT stay_events_to_unit_scope FOREIGN KEY(property_id,to_unit_id)
    REFERENCES stayhub.units(property_id,id)
);
CREATE INDEX IF NOT EXISTS stay_events_by_property ON stayhub.stay_events(property_id,created_at DESC);
REVOKE ALL ON ALL TABLES IN SCHEMA stayhub FROM PUBLIC;
