-- An owner-approved stay may receive one existing room contract without changing
-- the immutable bill or invoice snapshots. Ambiguous contracts remain private.
ALTER TABLE stayhub.stays ADD CONSTRAINT stays_contract_access_scope UNIQUE(property_id,id,account_id,unit_id);
CREATE TABLE stayhub.tenant_contract_access (
  property_id uuid NOT NULL,
  room_contract_id uuid NOT NULL,
  stay_id uuid NOT NULL,
  account_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(property_id,room_contract_id),
  UNIQUE(property_id,stay_id),
  CONSTRAINT tenant_contract_access_contract FOREIGN KEY(property_id,room_contract_id,unit_id)
    REFERENCES stayhub.room_contracts(property_id,id,unit_id),
  CONSTRAINT tenant_contract_access_stay FOREIGN KEY(property_id,stay_id,account_id,unit_id)
    REFERENCES stayhub.stays(property_id,id,account_id,unit_id)
);
CREATE INDEX tenant_contract_access_account_idx ON stayhub.tenant_contract_access(account_id,property_id,room_contract_id);
REVOKE ALL ON stayhub.tenant_contract_access FROM PUBLIC;

-- Existing approved devices are linked only when exactly one contract covered
-- the owner's approval date. This never rewrites a bill, invoice or contract.
WITH eligible AS (
  SELECT s.property_id,s.id AS stay_id,s.account_id,s.unit_id,c.id AS room_contract_id,
    count(*) OVER (PARTITION BY s.id) AS contract_count,
    count(*) OVER (PARTITION BY c.id) AS stay_count
  FROM stayhub.stays s
  JOIN stayhub.join_requests r ON r.id=s.join_request_id AND r.property_id=s.property_id
    AND r.account_id=s.account_id AND r.unit_id=s.unit_id AND r.status='approved'
  JOIN stayhub.tenant_devices d ON d.join_request_id=r.id AND d.property_id=s.property_id
    AND d.account_id=s.account_id AND d.unit_id=s.unit_id
  JOIN stayhub.room_contracts c ON c.property_id=s.property_id AND c.unit_id=s.unit_id
    AND (c.snapshot->>'startsOn')::date <= (r.reviewed_at AT TIME ZONE 'Asia/Bangkok')::date
    AND (c.snapshot->>'endsOn')::date >= (r.reviewed_at AT TIME ZONE 'Asia/Bangkok')::date
  WHERE s.ends_at IS NULL AND r.reviewed_at IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM stayhub.stays previous
      WHERE previous.property_id=s.property_id AND previous.unit_id=s.unit_id
        AND previous.account_id<>s.account_id)
)
INSERT INTO stayhub.tenant_contract_access(property_id,room_contract_id,stay_id,account_id,unit_id)
SELECT property_id,room_contract_id,stay_id,account_id,unit_id FROM eligible
WHERE contract_count=1 AND stay_count=1
ON CONFLICT DO NOTHING;
