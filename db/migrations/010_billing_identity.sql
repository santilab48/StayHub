-- P2.5-B: database structures only; never run from a deployment hook.
-- The runner supplies the transaction. Existing stays/leases and legacy billing remain untouched.
ALTER TABLE stayhub.leases ADD CONSTRAINT leases_billing_identity_unique
  UNIQUE(property_id,id,stay_id,account_id,unit_id);

CREATE TABLE stayhub.billing_meter_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  meter_type text NOT NULL CHECK(meter_type IN ('water','electric')),
  period date NOT NULL CHECK(EXTRACT(day FROM period)=1),
  previous_reading numeric(14,3) NOT NULL CHECK(previous_reading>=0),
  current_reading numeric(14,3) NOT NULL CHECK(current_reading>=previous_reading),
  usage numeric(14,3) GENERATED ALWAYS AS (current_reading-previous_reading) STORED,
  unit_rate numeric(12,2) NOT NULL CHECK(unit_rate>=0),
  amount numeric(12,2) GENERATED ALWAYS AS (round((current_reading-previous_reading)*unit_rate,2)) STORED,
  recorded_by uuid NOT NULL REFERENCES stayhub.accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_meter_unit_scope FOREIGN KEY(property_id,unit_id) REFERENCES stayhub.units(property_id,id),
  CONSTRAINT billing_meter_period_unique UNIQUE(property_id,unit_id,meter_type,period),
  CONSTRAINT billing_meter_item_identity UNIQUE(property_id,id,unit_id,meter_type,period)
);
-- previous_reading must always be explicitly supplied, even for the first month.

CREATE TABLE stayhub.billing_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  account_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  stay_id uuid NOT NULL,
  lease_id uuid NOT NULL,
  period date NOT NULL CHECK(EXTRACT(day FROM period)=1),
  bill_type text NOT NULL DEFAULT 'monthly' CHECK(bill_type='monthly'),
  total numeric(12,2) NOT NULL CHECK(total>=0),
  finalized boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid','partial','paid','void')),
  created_by uuid NOT NULL REFERENCES stayhub.accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_bill_lease_scope FOREIGN KEY(property_id,lease_id,stay_id,account_id,unit_id)
    REFERENCES stayhub.leases(property_id,id,stay_id,account_id,unit_id),
  CONSTRAINT billing_bill_period_unique UNIQUE(property_id,lease_id,period,bill_type),
  CONSTRAINT billing_bill_item_identity UNIQUE(property_id,id,unit_id,period),
  CONSTRAINT billing_bill_payment_identity UNIQUE(property_id,id)
);
CREATE INDEX billing_bills_account_period ON stayhub.billing_bills(account_id,property_id,period DESC);
CREATE INDEX billing_bills_property_period ON stayhub.billing_bills(property_id,period DESC);

CREATE TABLE stayhub.billing_bill_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  bill_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  period date NOT NULL,
  fee_code text NOT NULL CHECK(fee_code IN ('rent','water','electric','other')),
  label text NOT NULL CHECK(length(trim(label))>0),
  quantity numeric(14,3) NOT NULL CHECK(quantity>=0),
  unit_rate numeric(12,2) NOT NULL CHECK(unit_rate>=0),
  amount numeric(12,2) NOT NULL CHECK(amount>=0 AND amount=round(quantity*unit_rate,2)),
  meter_reading_id uuid,
  CONSTRAINT billing_item_meter_requirement CHECK((fee_code IN ('water','electric'))=(meter_reading_id IS NOT NULL)),
  CONSTRAINT billing_item_bill_scope FOREIGN KEY(property_id,bill_id,unit_id,period)
    REFERENCES stayhub.billing_bills(property_id,id,unit_id,period),
  CONSTRAINT billing_item_meter_scope FOREIGN KEY(property_id,meter_reading_id,unit_id,fee_code,period)
    REFERENCES stayhub.billing_meter_readings(property_id,id,unit_id,meter_type,period),
  CONSTRAINT billing_item_meter_once UNIQUE(meter_reading_id)
);
CREATE INDEX billing_items_bill ON stayhub.billing_bill_items(property_id,bill_id);

CREATE TABLE stayhub.billing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  bill_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK(amount>0),
  method text NOT NULL CHECK(method IN ('cash','transfer')),
  confirmed_by uuid NOT NULL REFERENCES stayhub.accounts(id),
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key text NOT NULL CHECK(length(idempotency_key) BETWEEN 16 AND 128),
  CONSTRAINT billing_payment_bill_scope FOREIGN KEY(property_id,bill_id)
    REFERENCES stayhub.billing_bills(property_id,id),
  CONSTRAINT billing_payment_idempotency UNIQUE(property_id,idempotency_key)
);
CREATE INDEX billing_payments_bill ON stayhub.billing_payments(property_id,bill_id);

-- Prevent silent changes to issued snapshots. Future corrections require a separate audited workflow.
CREATE FUNCTION stayhub.billing_reject_snapshot_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Issued billing snapshots are immutable' USING ERRCODE='23514';
END $$;
CREATE TRIGGER billing_items_immutable BEFORE UPDATE OR DELETE ON stayhub.billing_bill_items
  FOR EACH ROW EXECUTE FUNCTION stayhub.billing_reject_snapshot_change();
CREATE TRIGGER billing_payments_immutable BEFORE UPDATE OR DELETE ON stayhub.billing_payments
  FOR EACH ROW EXECUTE FUNCTION stayhub.billing_reject_snapshot_change();
CREATE FUNCTION stayhub.billing_guard_meter_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM stayhub.billing_bill_items WHERE meter_reading_id=OLD.id) THEN
    RAISE EXCEPTION 'Billed meter reading is immutable' USING ERRCODE='23514';
  END IF;
  -- For unbilled readings, an UPDATE trigger must return NEW, not OLD.
  -- Returning OLD silently discards valid changes in PostgreSQL.
  IF TG_OP='UPDATE' THEN RETURN NEW; END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER billing_meter_billed_immutable BEFORE UPDATE OR DELETE ON stayhub.billing_meter_readings
  FOR EACH ROW EXECUTE FUNCTION stayhub.billing_guard_meter_update();

CREATE FUNCTION stayhub.billing_guard_item_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b stayhub.billing_bills%ROWTYPE; m stayhub.billing_meter_readings%ROWTYPE;
BEGIN
  SELECT * INTO b FROM stayhub.billing_bills WHERE id=NEW.bill_id FOR UPDATE;
  IF b.id IS NULL OR b.finalized OR b.status<>'unpaid' OR EXISTS(SELECT 1 FROM stayhub.billing_payments WHERE bill_id=NEW.bill_id) THEN
    RAISE EXCEPTION 'Cannot add items to settled bill' USING ERRCODE='23514';
  END IF;
  IF NEW.meter_reading_id IS NOT NULL THEN
    -- Assignment and transfer paths also lock the unit before modifying stays.
    PERFORM 1 FROM stayhub.units WHERE property_id=NEW.property_id AND id=NEW.unit_id FOR UPDATE;
    SELECT * INTO m FROM stayhub.billing_meter_readings WHERE id=NEW.meter_reading_id FOR UPDATE;
    IF m.amount<>NEW.amount OR m.unit_rate<>NEW.unit_rate OR m.usage<>NEW.quantity THEN
      RAISE EXCEPTION 'Meter snapshot mismatch' USING ERRCODE='23514';
    END IF;
    -- Shared and sequential occupancy need explicit allocation policy before utility billing.
    IF (SELECT count(*) FROM stayhub.stays s WHERE s.property_id=NEW.property_id AND s.unit_id=NEW.unit_id
         AND s.starts_at < ((NEW.period+interval '1 month')::date AT TIME ZONE 'Asia/Bangkok')
         AND (s.ends_at IS NULL OR s.ends_at > (NEW.period AT TIME ZONE 'Asia/Bangkok'))) <> 1
       OR NOT EXISTS (SELECT 1 FROM stayhub.stays s WHERE s.id=b.stay_id AND s.property_id=NEW.property_id
         AND s.unit_id=NEW.unit_id AND s.starts_at < ((NEW.period+interval '1 month')::date AT TIME ZONE 'Asia/Bangkok')
         AND (s.ends_at IS NULL OR s.ends_at > (NEW.period AT TIME ZONE 'Asia/Bangkok'))) THEN
      RAISE EXCEPTION 'Meter allocation requires exactly one stay in period' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER billing_item_insert_guard BEFORE INSERT ON stayhub.billing_bill_items
  FOR EACH ROW EXECUTE FUNCTION stayhub.billing_guard_item_insert();

CREATE FUNCTION stayhub.billing_check_total() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b stayhub.billing_bills%ROWTYPE;
BEGIN
  SELECT * INTO b FROM stayhub.billing_bills WHERE id=NEW.id;
  IF NOT b.finalized OR b.total<>(SELECT COALESCE(sum(amount),0) FROM stayhub.billing_bill_items WHERE bill_id=NEW.id)
     OR NOT EXISTS(SELECT 1 FROM stayhub.billing_bill_items WHERE bill_id=NEW.id AND fee_code='rent') THEN
    RAISE EXCEPTION 'Bill total or rent item missing' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER billing_total_at_commit AFTER INSERT ON stayhub.billing_bills
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION stayhub.billing_check_total();

CREATE FUNCTION stayhub.billing_guard_bill_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.property_id,NEW.account_id,NEW.unit_id,NEW.stay_id,NEW.lease_id,NEW.period,NEW.bill_type,NEW.total,NEW.created_by)
     IS DISTINCT FROM (OLD.property_id,OLD.account_id,OLD.unit_id,OLD.stay_id,OLD.lease_id,OLD.period,OLD.bill_type,OLD.total,OLD.created_by)
     OR (OLD.finalized AND NOT NEW.finalized)
     OR (NEW.status IS DISTINCT FROM OLD.status AND pg_trigger_depth()=1)
     OR (NEW.status='void' AND EXISTS(SELECT 1 FROM stayhub.billing_payments WHERE bill_id=OLD.id)) THEN
    RAISE EXCEPTION 'Bill snapshot cannot be changed' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER billing_bill_update_guard BEFORE UPDATE ON stayhub.billing_bills
  FOR EACH ROW EXECUTE FUNCTION stayhub.billing_guard_bill_update();
CREATE TRIGGER billing_bill_delete_guard BEFORE DELETE ON stayhub.billing_bills
  FOR EACH ROW EXECUTE FUNCTION stayhub.billing_reject_snapshot_change();

CREATE FUNCTION stayhub.billing_confirm_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b stayhub.billing_bills%ROWTYPE; paid numeric(12,2);
BEGIN
  SELECT * INTO b FROM stayhub.billing_bills WHERE id=NEW.bill_id FOR UPDATE;
  IF b.id IS NULL OR NOT b.finalized OR b.status='void' THEN
    RAISE EXCEPTION 'Bill unavailable for payment' USING ERRCODE='23514';
  END IF;
  SELECT COALESCE(sum(amount),0) INTO paid FROM stayhub.billing_payments WHERE bill_id=NEW.bill_id;
  IF paid+NEW.amount>b.total THEN RAISE EXCEPTION 'Payment exceeds bill' USING ERRCODE='23514'; END IF;
  UPDATE stayhub.billing_bills SET status=CASE WHEN paid+NEW.amount=b.total THEN 'paid' ELSE 'partial' END
    WHERE id=NEW.bill_id;
  RETURN NEW;
END $$;
CREATE TRIGGER billing_payment_insert_guard BEFORE INSERT ON stayhub.billing_payments
  FOR EACH ROW EXECUTE FUNCTION stayhub.billing_confirm_payment();

-- Ensure inserted bill belongs to the lease's actual effective month and its stay.
CREATE FUNCTION stayhub.billing_check_bill_lease() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE l stayhub.leases%ROWTYPE; s stayhub.stays%ROWTYPE;
BEGIN
  SELECT * INTO l FROM stayhub.leases WHERE id=NEW.lease_id AND property_id=NEW.property_id FOR UPDATE;
  SELECT * INTO s FROM stayhub.stays WHERE id=NEW.stay_id AND property_id=NEW.property_id FOR UPDATE;
  IF s.id IS NULL OR l.id IS NULL OR l.status<>'active'
     OR NEW.period>COALESCE(l.ends_on,'infinity'::date)
     OR (NEW.period+interval '1 month')::date<=l.starts_on
     OR (NEW.period+interval '1 month')::date<= (s.starts_at AT TIME ZONE 'Asia/Bangkok')::date
     OR (s.ends_at IS NOT NULL AND NEW.period>(s.ends_at AT TIME ZONE 'Asia/Bangkok')::date) THEN
    RAISE EXCEPTION 'Bill outside active lease/stay dates' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER billing_bill_lease_guard BEFORE INSERT ON stayhub.billing_bills
  FOR EACH ROW EXECUTE FUNCTION stayhub.billing_check_bill_lease();

REVOKE ALL ON ALL TABLES IN SCHEMA stayhub FROM PUBLIC;
