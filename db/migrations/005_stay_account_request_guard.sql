-- Keep the approved occupant account bound to the actual join-request account.
-- This prevents a mistaken SQL write from linking someone else's account to a stay.
ALTER TABLE stayhub.join_requests
  ADD CONSTRAINT join_requests_id_property_account_unique
  UNIQUE (id,property_id,account_id);

ALTER TABLE stayhub.stays
  ADD CONSTRAINT stays_request_account_scope
  FOREIGN KEY (join_request_id,property_id,account_id)
  REFERENCES stayhub.join_requests(id,property_id,account_id);

-- Existing stays without a join request remain valid for future manual assignment workflows,
-- but any stay that does reference a join request must match property + account exactly.
