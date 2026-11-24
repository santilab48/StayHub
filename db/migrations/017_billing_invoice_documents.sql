-- Immutable invoice document generated in the same transaction as bill issuance.
-- A nullable recipient is intentionally private until a verified lease/stay account exists.
ALTER TABLE stayhub.billing_bills
  ADD CONSTRAINT billing_invoice_recipient_scope UNIQUE(property_id,id,account_id);

CREATE TABLE stayhub.billing_invoice_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  bill_id uuid NOT NULL UNIQUE,
  recipient_account_id uuid,
  pdf bytea NOT NULL CHECK(octet_length(pdf)>100 AND octet_length(pdf)<5000000),
  filename text NOT NULL CHECK(length(filename) BETWEEN 5 AND 180),
  mime_type text NOT NULL DEFAULT 'application/pdf' CHECK(mime_type='application/pdf'),
  sha256 char(64) NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoice_bill_scope FOREIGN KEY(property_id,bill_id)
    REFERENCES stayhub.billing_bills(property_id,id),
  CONSTRAINT invoice_recipient_scope FOREIGN KEY(property_id,bill_id,recipient_account_id)
    REFERENCES stayhub.billing_bills(property_id,id,account_id)
);
CREATE INDEX billing_invoice_recipient_idx
  ON stayhub.billing_invoice_documents(recipient_account_id,property_id,bill_id)
  WHERE recipient_account_id IS NOT NULL;
REVOKE ALL ON stayhub.billing_invoice_documents FROM PUBLIC;
