-- Repair requests are property scoped, bound to a real room and a signed-in account.
CREATE TABLE IF NOT EXISTS stayhub.repair_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 property_id uuid NOT NULL REFERENCES stayhub.properties(id) ON DELETE CASCADE,
 unit_id uuid NOT NULL,
 account_id uuid NOT NULL REFERENCES stayhub.accounts(id),
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 160),
 detail text NOT NULL CHECK(length(trim(detail)) BETWEEN 1 AND 4000),
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','accepted','scheduled','in_progress','completed','closed')),
 appointment_at timestamptz,
 appointment_reply text CHECK(appointment_reply IN ('confirmed','change_requested')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 closed_at timestamptz,
 updated_by uuid REFERENCES stayhub.accounts(id),
 UNIQUE(property_id,id),
 CONSTRAINT repairs_unit_scope FOREIGN KEY(property_id,unit_id) REFERENCES stayhub.units(property_id,id)
);
CREATE INDEX IF NOT EXISTS repair_requests_by_property ON stayhub.repair_requests(property_id,created_at DESC);
REVOKE ALL ON ALL TABLES IN SCHEMA stayhub FROM PUBLIC;
