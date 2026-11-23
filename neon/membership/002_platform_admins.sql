-- P6.3 Platform administrator identity registry. Neon-only, additive and empty by default.
-- The Railway account UUID is checked against a live Railway HTTP-only session.
-- DO NOT create any default super-admin account, seed roles or grant privileges to customers.
CREATE TABLE IF NOT EXISTS stayhub_membership.platform_admins (
  railway_account_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  granted_by text NOT NULL CHECK(length(trim(granted_by)) BETWEEN 1 AND 120),
  reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT platform_admins_valid_revocation CHECK (revoked_at IS NULL OR NOT enabled)
);
CREATE INDEX IF NOT EXISTS platform_admins_enabled_idx
  ON stayhub_membership.platform_admins(railway_account_id)
  WHERE enabled=true AND revoked_at IS NULL;
REVOKE ALL ON stayhub_membership.platform_admins FROM PUBLIC;
-- Provisioning is a separate audited operator action, not an API endpoint.
