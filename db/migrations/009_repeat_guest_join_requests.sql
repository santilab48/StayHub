-- Repeated nightly guests may submit a new request after earlier approval/rejection.
-- Still allow only one pending request per account per property.
ALTER TABLE stayhub.join_requests
  DROP CONSTRAINT IF EXISTS join_requests_property_id_account_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS join_requests_one_pending_per_account_property
  ON stayhub.join_requests(property_id,account_id)
  WHERE status='pending';

CREATE INDEX IF NOT EXISTS join_requests_account_history
  ON stayhub.join_requests(account_id,created_at DESC);

REVOKE ALL ON ALL TABLES IN SCHEMA stayhub FROM PUBLIC;
