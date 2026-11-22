-- Read-only exact fingerprint for an authorized Railway Production source and an isolated restore.
-- Run only after verifying the connection identity. Output contains metadata and counts, no row contents.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '15s';
SELECT current_database() AS database_name, current_user AS role_name, current_setting('transaction_read_only') AS read_only;
WITH inventory AS (
SELECT 'table' AS kind, 'accounts' AS name, COUNT(*)::text AS value FROM stayhub.accounts
UNION ALL
SELECT 'table' AS kind, 'properties' AS name, COUNT(*)::text AS value FROM stayhub.properties
UNION ALL
SELECT 'table' AS kind, 'property_memberships' AS name, COUNT(*)::text AS value FROM stayhub.property_memberships
UNION ALL
SELECT 'table' AS kind, 'units' AS name, COUNT(*)::text AS value FROM stayhub.units
UNION ALL
SELECT 'table' AS kind, 'reservations' AS name, COUNT(*)::text AS value FROM stayhub.reservations
UNION ALL
SELECT 'table' AS kind, 'notifications' AS name, COUNT(*)::text AS value FROM stayhub.notifications
UNION ALL
SELECT 'table' AS kind, 'sessions' AS name, COUNT(*)::text AS value FROM stayhub.sessions
UNION ALL
SELECT 'table' AS kind, 'invites' AS name, COUNT(*)::text AS value FROM stayhub.invites
UNION ALL
SELECT 'table' AS kind, 'join_requests' AS name, COUNT(*)::text AS value FROM stayhub.join_requests
UNION ALL
SELECT 'table' AS kind, 'stays' AS name, COUNT(*)::text AS value FROM stayhub.stays
UNION ALL
SELECT 'table' AS kind, 'auth_attempts' AS name, COUNT(*)::text AS value FROM stayhub.auth_attempts
UNION ALL
SELECT 'table' AS kind, 'unit_blocks' AS name, COUNT(*)::text AS value FROM stayhub.unit_blocks
UNION ALL
SELECT 'table' AS kind, 'housekeeping_tasks' AS name, COUNT(*)::text AS value FROM stayhub.housekeeping_tasks
UNION ALL
SELECT 'table' AS kind, 'stay_events' AS name, COUNT(*)::text AS value FROM stayhub.stay_events
UNION ALL
SELECT 'table' AS kind, 'leases' AS name, COUNT(*)::text AS value FROM stayhub.leases
UNION ALL
SELECT 'table' AS kind, 'billing_meter_readings' AS name, COUNT(*)::text AS value FROM stayhub.billing_meter_readings
UNION ALL
SELECT 'table' AS kind, 'billing_bills' AS name, COUNT(*)::text AS value FROM stayhub.billing_bills
UNION ALL
SELECT 'table' AS kind, 'billing_bill_items' AS name, COUNT(*)::text AS value FROM stayhub.billing_bill_items
UNION ALL
SELECT 'table' AS kind, 'billing_payments' AS name, COUNT(*)::text AS value FROM stayhub.billing_payments
UNION ALL
SELECT 'table' AS kind, 'schema_migrations' AS name, COUNT(*)::text AS value FROM stayhub.schema_migrations
UNION ALL
SELECT 'migration', filename, checksum FROM stayhub.schema_migrations
UNION ALL
SELECT 'catalog', 'constraint_count', COUNT(*)::text FROM pg_constraint WHERE connamespace = 'stayhub'::regnamespace
UNION ALL
SELECT 'catalog', 'constraint_fingerprint', md5(COALESCE(string_agg(conrelid::regclass::text || ':' || conname || ':' || contype || ':' || pg_get_constraintdef(oid), E'\n' ORDER BY conrelid::regclass::text, conname), '')) FROM pg_constraint WHERE connamespace = 'stayhub'::regnamespace
UNION ALL
SELECT 'catalog', 'index_count', COUNT(*)::text FROM pg_indexes WHERE schemaname = 'stayhub'
UNION ALL
SELECT 'catalog', 'index_fingerprint', md5(COALESCE(string_agg(indexname || ':' || indexdef, E'\n' ORDER BY indexname), '')) FROM pg_indexes WHERE schemaname = 'stayhub'
UNION ALL
SELECT 'extension', extname, extversion FROM pg_extension WHERE extname IN ('btree_gist','pgcrypto')
)
SELECT kind || '|' || name || '|' || value AS fingerprint_line FROM inventory ORDER BY kind, name;
COMMIT;
