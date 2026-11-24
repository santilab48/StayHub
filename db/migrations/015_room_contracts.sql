CREATE TABLE IF NOT EXISTS stayhub.room_contracts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 property_id uuid NOT NULL REFERENCES stayhub.properties(id),
 unit_id uuid NOT NULL REFERENCES stayhub.units(id),
 created_by uuid NOT NULL REFERENCES stayhub.accounts(id),
 snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot)='object'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS room_contracts_room_idx ON stayhub.room_contracts(property_id,unit_id,created_at DESC);
