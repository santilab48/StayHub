-- Bound repeated authentication attempts across all Railway web replicas.
-- No plaintext email/IP is stored; the server supplies SHA-256 keys.
CREATE TABLE IF NOT EXISTS stayhub.auth_attempts (
  scope text NOT NULL CHECK (scope IN ('login','register')),
  identifier_hash char(64) NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
  reset_at timestamptz NOT NULL,
  PRIMARY KEY(scope,identifier_hash)
);
CREATE INDEX IF NOT EXISTS auth_attempts_reset_at_idx ON stayhub.auth_attempts(reset_at);
REVOKE ALL ON ALL TABLES IN SCHEMA stayhub FROM PUBLIC;
