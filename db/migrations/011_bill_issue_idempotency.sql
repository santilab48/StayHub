-- P2.5-C: persist the request identity independently of the lease/month uniqueness.
-- No existing billing rows have been issued; nullable columns preserve migration 010 data.
ALTER TABLE stayhub.billing_bills
  ADD COLUMN idempotency_key text CHECK(idempotency_key IS NULL OR length(idempotency_key) BETWEEN 16 AND 128),
  ADD COLUMN request_hash char(64) CHECK(request_hash IS NULL OR request_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE stayhub.billing_bills ADD CONSTRAINT billing_issue_key_pair
  CHECK((idempotency_key IS NULL)=(request_hash IS NULL));
CREATE UNIQUE INDEX billing_issue_idempotency ON stayhub.billing_bills(property_id,idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE FUNCTION stayhub.billing_guard_issue_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.request_hash IS DISTINCT FROM OLD.request_hash THEN
    RAISE EXCEPTION 'Bill issue identity is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER billing_issue_identity_immutable BEFORE UPDATE ON stayhub.billing_bills
  FOR EACH ROW EXECUTE FUNCTION stayhub.billing_guard_issue_identity();
REVOKE ALL ON ALL TABLES IN SCHEMA stayhub FROM PUBLIC;
