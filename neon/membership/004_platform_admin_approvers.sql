-- P6.5: retain independently verified Railway identities of both signers.
-- Additive for existing staging audit rows; new events require both identities.
ALTER TABLE stayhub_membership.platform_admin_events
  ADD COLUMN IF NOT EXISTS approver_a_railway_account_id uuid,
  ADD COLUMN IF NOT EXISTS approver_b_railway_account_id uuid;
CREATE OR REPLACE FUNCTION stayhub_membership.validate_platform_admin_event_approvers()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.approver_a_railway_account_id IS NULL OR
     NEW.approver_b_railway_account_id IS NULL OR
     NEW.approver_a_railway_account_id = NEW.approver_b_railway_account_id OR
     NEW.railway_account_id IN
       (NEW.approver_a_railway_account_id, NEW.approver_b_railway_account_id) THEN
    RAISE EXCEPTION 'Two distinct approvers other than the target are required';
  END IF;
  RETURN NEW;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='stayhub_membership.platform_admin_events'::regclass
      AND tgname='platform_admin_events_approvers'
  ) THEN
    CREATE TRIGGER platform_admin_events_approvers
    BEFORE INSERT ON stayhub_membership.platform_admin_events
    FOR EACH ROW EXECUTE FUNCTION stayhub_membership.validate_platform_admin_event_approvers();
  END IF;
END
$$;
