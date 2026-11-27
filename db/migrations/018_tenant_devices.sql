-- A QR starts a pending device request; it grants no room access by itself.
ALTER TABLE stayhub.join_requests
  ADD CONSTRAINT join_request_device_identity UNIQUE(property_id,id,account_id,unit_id);
CREATE TABLE stayhub.tenant_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES stayhub.accounts(id),
  join_request_id uuid NOT NULL UNIQUE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_device_unit_scope FOREIGN KEY(property_id,unit_id)
    REFERENCES stayhub.units(property_id,id),
  CONSTRAINT tenant_device_request_scope FOREIGN KEY(property_id,join_request_id,account_id,unit_id)
    REFERENCES stayhub.join_requests(property_id,id,account_id,unit_id)
);
CREATE INDEX tenant_devices_account_active_idx
  ON stayhub.tenant_devices(account_id,property_id,unit_id)
  WHERE revoked_at IS NULL;
REVOKE ALL ON stayhub.tenant_devices FROM PUBLIC;
