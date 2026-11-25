CREATE TABLE stayhub.guesthouse_cash_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 property_id uuid NOT NULL REFERENCES stayhub.properties(id),
 reservation_id uuid NOT NULL REFERENCES stayhub.reservations(id),
 receipt_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 issued_at timestamptz NOT NULL DEFAULT now(),
 issued_by uuid NOT NULL REFERENCES stayhub.accounts(id),
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 UNIQUE(property_id,reservation_id)
);
CREATE INDEX guesthouse_cash_receipts_property_idx ON stayhub.guesthouse_cash_receipts(property_id,issued_at DESC);
