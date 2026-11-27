-- StayHub P2.3: monthly leases remain linked to the verified stay and its property.
-- Legal documents, signatures, billing and deposits settlement are later features.
ALTER TABLE stayhub.stays
  ADD CONSTRAINT stays_lease_identity_scope UNIQUE(property_id,id,account_id,unit_id);

CREATE TABLE IF NOT EXISTS stayhub.leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  stay_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES stayhub.accounts(id),
  unit_id uuid NOT NULL,
  starts_on date NOT NULL,
  ends_on date,
  monthly_rent numeric(12,2) NOT NULL CHECK(monthly_rent>=0),
  security_deposit numeric(12,2) NOT NULL DEFAULT 0 CHECK(security_deposit>=0),
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','terminated')),
  terminated_at timestamptz,
  created_by uuid NOT NULL REFERENCES stayhub.accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lease_dates CHECK(ends_on IS NULL OR ends_on>=starts_on),
  CONSTRAINT lease_termination_consistency CHECK (
    (status='active' AND terminated_at IS NULL) OR
    (status='terminated' AND terminated_at IS NOT NULL)
  ),
  CONSTRAINT lease_unit_scope FOREIGN KEY(property_id,unit_id)
    REFERENCES stayhub.units(property_id,id),
  CONSTRAINT lease_stay_identity_scope FOREIGN KEY(property_id,stay_id,account_id,unit_id)
    REFERENCES stayhub.stays(property_id,id,account_id,unit_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS leases_one_active_per_stay
  ON stayhub.leases(stay_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS leases_property_created
  ON stayhub.leases(property_id,created_at DESC);
REVOKE ALL ON ALL TABLES IN SCHEMA stayhub FROM PUBLIC;
