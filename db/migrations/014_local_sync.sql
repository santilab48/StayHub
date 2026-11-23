-- Local sync receipt and revision state (Railway PostgreSQL staging and production).
-- Production deployment requires property-scoped authenticated sync; never sync bill drafts as issued bills.
CREATE TABLE IF NOT EXISTS stayhub.local_sync_receipts (
  operation_id uuid PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES stayhub.properties(id),
  account_id uuid NOT NULL REFERENCES stayhub.accounts(id),
  request_hash text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type = 'units'),
  entity_id uuid NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('accepted','conflict','rejected')),
  server_record jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS stayhub.local_sync_revisions (
  property_id uuid NOT NULL REFERENCES stayhub.properties(id),
  entity_id uuid NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  PRIMARY KEY (property_id, entity_id)
);
REVOKE ALL ON stayhub.local_sync_receipts, stayhub.local_sync_revisions FROM PUBLIC;
