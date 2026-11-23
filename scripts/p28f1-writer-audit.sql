-- Operator-only snapshot on an already verified source connection.
-- Read-only metadata; never interprets a zero count as a global write freeze.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';

SELECT current_database() AS database_name,
       current_user AS observer_role,
       current_setting('transaction_read_only') AS observer_read_only;

SELECT rolname AS observer_role, rolcanlogin, rolsuper, rolbypassrls
FROM pg_roles WHERE rolname = current_user;

-- NULL identity fields indicate insufficient visibility; stop rather than
-- treating hidden sessions as absent. Do not return SQL text or client IPs.
SELECT COALESCE(usename, '<hidden>') AS role_name,
       COALESCE(NULLIF(application_name, ''), '<unlabeled>') AS app_name,
       COALESCE(state, '<hidden>') AS connection_state,
       COUNT(*)::integer AS sessions
FROM pg_stat_activity
WHERE datname = current_database()
  AND backend_type = 'client backend'
  AND pid <> pg_backend_pid()
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;

COMMIT;
