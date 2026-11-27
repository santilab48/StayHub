# StayHub P2.7-D — Railway Production actual row-count verification

Date: 2026-11-22 (Asia/Bangkok)
Status: **Production business tables EMPTY, based on user's live psql output; migration history 11/11.**

## Evidence collected by user from the real Railway PostgreSQL over authenticated CLI SSH tunnel

- Railway service: `Postgres-PDqf`, environment `production` in project `a8a5a434-4d18-438f-b4ea-ece072094595`.
- `psql` client 18.7 connected with SSL (TLS 1.3) to PostgreSQL server 18.6.
- `current_database() = railway`, `current_user = postgres`.
- `SELECT count(*) FROM stayhub.schema_migrations` returned **11**.
- `pg_stat_user_tables` listed **20** StayHub tables. Its `n_live_tup` estimates were all 0 except 11 for `schema_migrations` (estimates alone are not considered exact).
- User then executed exact `count(*)` queries against six primary tables:

| Table | Exact count |
|---|---:|
| accounts | 0 |
| properties | 0 |
| units | 0 |
| stays | 0 |
| billing_bills | 0 |
| billing_payments | 0 |

- A second SQL statement summed exact `count(*)` from remaining 13 business tables and returned **0**:
  `auth_attempts`, `billing_bill_items`, `billing_meter_readings`, `housekeeping_tasks`, `invites`, `join_requests`, `leases`, `notifications`, `property_memberships`, `reservations`, `sessions`, `stay_events`, `unit_blocks`.

Because each table's count is nonnegative, the 13-table sum equal to zero proves all 13 tables individually contain 0 rows at the time of inspection. Combined with the first six, all **19 business tables contain zero rows**. Only the 11 migration records exist in the 20th table.

## Independent checks using connected services

- Railway Production application: SUCCESS, commit `81338194aec3d3bd646e6bbe51215ffb9eb530dc`, remains unchanged.
- Neon `stayhub-db` staging branch `br-fancy-sky-a1n96vul`: 11 migration records, live billing E2E verified in earlier stages.
- Neon production branch `br-snowy-tree-a1kt7omx`: **0 StayHub tables**.
- Automated full database backup/restore rehearsal on disposable PostgreSQL 18 databases: [SUCCESS](https://github.com/santilab48/StayHub/actions/runs/45025071348).
- Automated restored database table/migration/constraint/index/billing aggregate equality and tamper detection: [SUCCESS](https://github.com/santilab48/StayHub/actions/runs/45025607241).

## Consequences / decisions

- An application-data transfer from Railway Production appears **unnecessary**, because no customer, property, billing or other business rows exist as of the user's verified SQL counts.
- **Schema migration is still required** to create the 20-table StayHub schema on empty Neon Production. Use the reviewed migration files 001–011 in order with checksum verification; do not copy test users/data from Neon staging.
- Before Production cutover, verify current Railway counts are still zero (or freeze new registrations/writes), prepare a rollback strategy preserving original Railway `DATABASE_URL`, and test Neon Production health/auth/billing without leaving customer-looking test records.
- Railway backups and recoverability are **not** independently verified. The empty-data finding lowers migration complexity but does not establish rollback/backup correctness.
- No Production database changes, project configuration switches, destructive SQL, or new services were performed in this verification.

Evidence source: user's pasted live `psql` command results in this ChatGPT conversation, not an independently issued SQL query by the assistant.
