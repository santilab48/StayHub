-- P6.4: append-only admin grants/revocations audit on Neon ONLY.
-- Apply only after verifying the correct Neon staging branch. No default operators.
CREATE TABLE IF NOT EXISTS stayhub_membership.platform_admin_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  railway_account_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('grant','revoke')),
  approver_a_fingerprint text NOT NULL,
  approver_b_fingerprint text NOT NULL,
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 5 AND 500),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_admin_events_account_idx
  ON stayhub_membership.platform_admin_events(railway_account_id,occurred_at DESC);
REVOKE ALL ON stayhub_membership.platform_admin_events FROM PUBLIC;

CREATE FUNCTION stayhub_membership.reject_platform_admin_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Platform administrator audit events are append-only';
END
$$;
CREATE TRIGGER platform_admin_events_immutable
BEFORE UPDATE OR DELETE ON stayhub_membership.platform_admin_events
FOR EACH ROW EXECUTE FUNCTION stayhub_membership.reject_platform_admin_event_mutation();
