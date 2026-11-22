-- Owner/account identity and secure QR invitation binding.
-- All roles stay server-only. A QR token never grants access to a unit by itself.
ALTER TABLE stayhub.accounts ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE stayhub.accounts ADD COLUMN IF NOT EXISTS display_name text;

CREATE TABLE IF NOT EXISTS stayhub.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES stayhub.accounts(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS sessions_account_idx ON stayhub.sessions(account_id,expires_at);

CREATE TABLE IF NOT EXISTS stayhub.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES stayhub.properties(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES stayhub.accounts(id),
  token_hash char(64) NOT NULL UNIQUE,
  unit_id uuid,
  expires_at timestamptz NOT NULL,
  max_uses integer NOT NULL DEFAULT 100 CHECK(max_uses BETWEEN 1 AND 10000),
  use_count integer NOT NULL DEFAULT 0 CHECK(use_count >= 0),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id,id),
  CONSTRAINT invite_unit_scope FOREIGN KEY(property_id,unit_id)
    REFERENCES stayhub.units(property_id,id)
);
CREATE INDEX IF NOT EXISTS invites_property_idx ON stayhub.invites(property_id,created_at DESC);

CREATE TABLE IF NOT EXISTS stayhub.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES stayhub.invites(id),
  property_id uuid NOT NULL REFERENCES stayhub.properties(id),
  account_id uuid NOT NULL REFERENCES stayhub.accounts(id),
  unit_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES stayhub.accounts(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT request_unit_scope FOREIGN KEY(property_id,unit_id)
    REFERENCES stayhub.units(property_id,id),
  CONSTRAINT request_invite_scope FOREIGN KEY(property_id,invite_id)
    REFERENCES stayhub.invites(property_id,id),
  UNIQUE(property_id,id),
  UNIQUE(property_id,account_id)
);
CREATE INDEX IF NOT EXISTS join_requests_pending_idx
  ON stayhub.join_requests(property_id,created_at DESC) WHERE status='pending';

-- Unit assignment is an explicit, time-bound identity binding, never inferred from a QR.
CREATE TABLE IF NOT EXISTS stayhub.stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES stayhub.properties(id),
  unit_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES stayhub.accounts(id),
  join_request_id uuid UNIQUE REFERENCES stayhub.join_requests(id),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  CONSTRAINT stay_unit_scope FOREIGN KEY(property_id,unit_id)
    REFERENCES stayhub.units(property_id,id),
  CONSTRAINT stay_request_scope FOREIGN KEY(property_id,join_request_id)
    REFERENCES stayhub.join_requests(property_id,id),
  CONSTRAINT stay_date_check CHECK(ends_at IS NULL OR ends_at>starts_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS stays_one_active_account_property_idx
  ON stayhub.stays(property_id,account_id) WHERE ends_at IS NULL;
REVOKE ALL ON ALL TABLES IN SCHEMA stayhub FROM PUBLIC;
