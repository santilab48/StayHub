-- Add room contract billing without inventing tenant accounts or stays.
ALTER TABLE stayhub.room_contracts ADD CONSTRAINT room_contracts_bill_scope UNIQUE(property_id,id,unit_id);
ALTER TABLE stayhub.billing_bills
 ADD COLUMN room_contract_id uuid,
 ALTER COLUMN account_id DROP NOT NULL,
 ALTER COLUMN stay_id DROP NOT NULL,
 ALTER COLUMN lease_id DROP NOT NULL,
 ADD CONSTRAINT billing_room_contract_scope FOREIGN KEY(property_id,room_contract_id,unit_id) REFERENCES stayhub.room_contracts(property_id,id,unit_id),
 ADD CONSTRAINT billing_source_exactly_one CHECK ((room_contract_id IS NULL AND account_id IS NOT NULL AND stay_id IS NOT NULL AND lease_id IS NOT NULL) OR (room_contract_id IS NOT NULL AND account_id IS NULL AND stay_id IS NULL AND lease_id IS NULL));
CREATE UNIQUE INDEX billing_room_contract_month_unique ON stayhub.billing_bills(property_id,unit_id,period) WHERE room_contract_id IS NOT NULL;
CREATE OR REPLACE FUNCTION stayhub.billing_guard_item_insert() RETURNS trigger LANGUAGE plpgsql AS $$
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
    IF b.room_contract_id IS NULL AND ((SELECT count(*) FROM stayhub.stays s WHERE s.property_id=NEW.property_id AND s.unit_id=NEW.unit_id
         AND s.starts_at < ((NEW.period+interval '1 month')::date AT TIME ZONE 'Asia/Bangkok')
         AND (s.ends_at IS NULL OR s.ends_at > (NEW.period AT TIME ZONE 'Asia/Bangkok'))) <> 1
       OR NOT EXISTS (SELECT 1 FROM stayhub.stays s WHERE s.id=b.stay_id AND s.property_id=NEW.property_id
         AND s.unit_id=NEW.unit_id AND s.starts_at < ((NEW.period+interval '1 month')::date AT TIME ZONE 'Asia/Bangkok')
         AND (s.ends_at IS NULL OR s.ends_at > (NEW.period AT TIME ZONE 'Asia/Bangkok')))) THEN
      RAISE EXCEPTION 'Meter allocation requires exactly one stay in period' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION stayhub.billing_guard_bill_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.property_id,NEW.account_id,NEW.unit_id,NEW.room_contract_id,NEW.stay_id,NEW.lease_id,NEW.period,NEW.bill_type,NEW.total,NEW.created_by)
     IS DISTINCT FROM (OLD.property_id,OLD.account_id,OLD.unit_id,OLD.room_contract_id,OLD.stay_id,OLD.lease_id,OLD.period,OLD.bill_type,OLD.total,OLD.created_by)
     OR (OLD.finalized AND NOT NEW.finalized)
     OR (NEW.status IS DISTINCT FROM OLD.status AND pg_trigger_depth()=1)
     OR (NEW.status='void' AND EXISTS(SELECT 1 FROM stayhub.billing_payments WHERE bill_id=OLD.id)) THEN
    RAISE EXCEPTION 'Bill snapshot cannot be changed' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION stayhub.billing_check_bill_lease() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE l stayhub.leases%ROWTYPE; s stayhub.stays%ROWTYPE;
BEGIN
  IF NEW.room_contract_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM stayhub.room_contracts c WHERE c.id=NEW.room_contract_id AND c.property_id=NEW.property_id AND c.unit_id=NEW.unit_id AND (c.snapshot->>'startsOn')::date < (NEW.period+interval '1 month')::date AND (c.snapshot->>'endsOn')::date >= NEW.period) THEN
      RAISE EXCEPTION 'Bill outside room contract dates' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
  END IF;
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
