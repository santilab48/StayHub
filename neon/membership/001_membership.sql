-- StayHub membership data lives ONLY in a separately provisioned Neon PostgreSQL database.
-- Identity/session, rooms, bills and payments remain on Railway PostgreSQL.
-- Apply manually only after Neon branch/db identity is confirmed. Never run in Railway migrations.
CREATE SCHEMA IF NOT EXISTS stayhub_membership;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS stayhub_membership.plans (
  code text PRIMARY KEY CHECK (code ~ '^[a-z][a-z0-9_]{1,31}$'),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 100),
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stayhub_membership.entitlements (
  code text PRIMARY KEY CHECK (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stayhub_membership.plan_entitlements (
  plan_code text NOT NULL REFERENCES stayhub_membership.plans(code),
  entitlement_code text NOT NULL REFERENCES stayhub_membership.entitlements(code),
  PRIMARY KEY (plan_code,entitlement_code)
);

-- UUID is the authoritative Railway stayhub.accounts.id, not a Neon password/account.
-- Cross-database FK is deliberately impossible; membership API always verifies Railway session first.
CREATE TABLE IF NOT EXISTS stayhub_membership.memberships (
  railway_account_id uuid PRIMARY KEY,
  plan_code text NOT NULL REFERENCES stayhub_membership.plans(code),
  status text NOT NULL CHECK (status IN ('trial','active','expired','suspended','cancelled')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at>starts_at),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL CHECK (length(trim(updated_by)) BETWEEN 1 AND 120),
  version bigint NOT NULL DEFAULT 1 CHECK (version>0)
);
CREATE INDEX IF NOT EXISTS memberships_status_expiry
  ON stayhub_membership.memberships (status,ends_at);

-- Immutable audit history; write only from a privileged, audited provisioning workflow.
CREATE TABLE IF NOT EXISTS stayhub_membership.membership_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  railway_account_id uuid NOT NULL,
  plan_code text NOT NULL,
  status text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  actor text NOT NULL,
  reason text NOT NULL CHECK (length(trim(reason))>0),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS membership_events_account
  ON stayhub_membership.membership_events (railway_account_id,occurred_at DESC);

-- Schema only: no default subscription, no free premium grants and no admin identities.
REVOKE ALL ON SCHEMA stayhub_membership FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA stayhub_membership FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA stayhub_membership FROM PUBLIC;
