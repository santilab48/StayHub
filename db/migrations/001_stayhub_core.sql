-- StayHub P1.5: isolated, additive schema for a new EMPTY Neon staging database.
-- No legacy Supabase auth or storage data is copied by this migration.
-- Run ONLY after confirming the target is the dedicated StayHub staging database.
BEGIN;
CREATE SCHEMA IF NOT EXISTS stayhub;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS stayhub.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounts_email_nonempty CHECK (length(trim(email)) > 3)
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_unique ON stayhub.accounts (lower(email));

CREATE TABLE IF NOT EXISTS stayhub.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_account_id uuid NOT NULL REFERENCES stayhub.accounts(id),
  name text NOT NULL CHECK(length(trim(name)) > 0),
  property_type text NOT NULL CHECK (property_type IN ('apartment','guesthouse','daily','homestay')),
  billing_mode text NOT NULL DEFAULT 'monthly' CHECK (billing_mode IN ('monthly','nightly','mixed')),
  timezone text NOT NULL DEFAULT 'Asia/Bangkok',
  currency char(3) NOT NULL DEFAULT 'THB',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stayhub.property_memberships (
  property_id uuid NOT NULL REFERENCES stayhub.properties(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES stayhub.accounts(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','staff','resident','guest')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(property_id,account_id)
);

CREATE TABLE IF NOT EXISTS stayhub.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES stayhub.properties(id) ON DELETE CASCADE,
  name text NOT NULL CHECK(length(trim(name)) > 0),
  kind text NOT NULL DEFAULT 'room' CHECK(kind IN ('room','bed','entire_property')),
  capacity integer NOT NULL DEFAULT 1 CHECK(capacity > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id,name),
  UNIQUE(property_id,id)
);

CREATE TABLE IF NOT EXISTS stayhub.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  guest_account_id uuid REFERENCES stayhub.accounts(id),
  arrival_date date NOT NULL,
  departure_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','checked_in','checked_out','cancelled','no_show')),
  total_amount numeric(12,2) CHECK(total_amount >= 0),
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservation_date_order CHECK(departure_date > arrival_date),
  CONSTRAINT reservation_unit_scope FOREIGN KEY(property_id,unit_id) REFERENCES stayhub.units(property_id,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS reservations_idempotency_unique
  ON stayhub.reservations(property_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS reservations_calendar_idx
  ON stayhub.reservations(property_id,unit_id,arrival_date,departure_date);

CREATE TABLE IF NOT EXISTS stayhub.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES stayhub.properties(id) ON DELETE CASCADE,
  recipient_account_id uuid NOT NULL REFERENCES stayhub.accounts(id),
  event_type text NOT NULL,
  title text NOT NULL,
  message text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_inbox_idx
  ON stayhub.notifications(recipient_account_id,created_at DESC);

-- Defense-in-depth: public/anonymous roles never receive direct access.
REVOKE ALL ON SCHEMA stayhub FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA stayhub FROM PUBLIC;

-- All table operations currently require a trusted, authenticated server role.
-- Application authorization is REQUIRED before any user-scoped SQL executes.
-- Do not grant access to browser-facing roles or claim RLS policies are ready.
COMMIT;
