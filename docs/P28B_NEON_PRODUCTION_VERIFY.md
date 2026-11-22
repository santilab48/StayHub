# P2.8-B — Neon Production verification

Date: 2026-11-22 (Asia/Bangkok). Read-only database audit.

## Target and Git

| Check | Result | Evidence |
| --- | --- | --- |
| Repository/branch | PASS | `santilab48/StayHub`, `feat/stayhub-p26-readiness`; fetched remote HEAD `0d9093b7cfa6d8a32b00807a4d19e1b24e80ea0e`, matching the clean review worktree before this report. No reset or cleanup. |
| Project/branch/database | PASS | Neon project `late-darkness-78944075` is named `stayhub-db`; default branch `br-snowy-tree-a1kt7omx` is `production`; SQL `current_database()` returned `neondb`. Separate staging branch is `br-fancy-sky-a1n96vul`. The other connected Neon account did not list this project. |
| Production writes during P2.8-B | PASS | Only catalog, history and `COUNT(*)` SELECT queries were issued. No accounts, bills, migrations or test fixtures were inserted. Railway settings and Production deployment were not changed. |

## Migration and schema results

All 11 rows of `stayhub.schema_migrations` were read from Production and compared byte-for-byte against SHA-256 of the corresponding SQL files in this Git revision. **11/11 matched in filename order.**

| File | SHA-256 |
| --- | --- |
| `001_stayhub_core.sql` | `138960ed35f003d330b72649a402f703395932d6ebd60c67037ac1de06c383b8` |
| `002_reservation_conflict_guard.sql` | `9204e6d4b5045de3bddb97d5cc7cf6e0e4f0abb7c3e1d35f1bdc4cee59f3d2f3` |
| `003_identity_invitation_binding.sql` | `c4c1dbcd7d10476984bbb59dc1313fae9f6dae15c55379630e5a24eed914a282` |
| `004_auth_throttling.sql` | `c99a7bf4bd3d54fb1fbb7739f3ceb6d1cc7e82223e924c9eb277914ccfd5acf4` |
| `005_stay_account_request_guard.sql` | `3502d68e4af8e5fe359c05a363b34ab90bff8ac57fb3f9e23fefc6173ad966d0` |
| `006_room_stay_lifecycle.sql` | `22b814464e46008aa3e2b5f64a79d5f2dd8a5f2296c7a90a3fd630d5da048b72` |
| `007_monthly_leases.sql` | `940adcc9af9d432670c9659d930b55e85b5fe3802e8fa779c2486cf3f3b4e8d4` |
| `008_reservation_stay_binding.sql` | `e9c40a4638f301864d01ccb2c7a03b8222a1494db5087c3a383097c11e8e58a1` |
| `009_repeat_guest_join_requests.sql` | `3d21a4d55f36860310aca3ff49884bef94c6caf4146bd7b40d2acb0b9e228775` |
| `010_billing_identity.sql` | `b45940bd587d62e7ca035301210681264a673dcd690c2bd7a60e44af7eb8c735` |
| `011_bill_issue_idempotency.sql` | `73290d1356f0bd7bcc10cf959c8b97d3ff542fd240e5f0e74680b69baffa37ec` |

Catalog SELECT results: **20 base tables, 277 constraints, 10 noninternal triggers, 64 indexes, 0 sequences.** Extensions: `btree_gist` 1.8 and `pgcrypto` 1.4. Constraint types: 48 CHECK, 48 foreign key, 139 NOT NULL, 20 primary key, 20 UNIQUE, 1 exclusion and 1 constraint trigger. UUID primary keys use `gen_random_uuid()` defaults (17 observed); the meter `usage` and `amount` columns are generated, and bill/payment status/timestamps use the expected defaults.

Billing catalog definitions were inspected without modifying rows: composite FKs from bills to `(property_id,lease_id,stay_id,account_id,unit_id)`, meter to `(property_id,unit_id)`, items to bill and matching meter type/period, and payments to `(property_id,bill_id)`; unique lease/month, meter type/month, payment idempotency and partial bill issue idempotency indexes; nonnegative meter/payment and matching item checks. The 10 triggers include bill total at commit, billed meter protection, item/payment snapshot immutability, bill issue identity protection, bill/lease guard and payment insertion guard. **This verifies definitions, not adversarial writes on Production.**

## Exact business table counts

Individual `SELECT count(*)` subqueries on Production, not `n_live_tup`, returned **0 for each**:

`accounts`, `properties`, `property_memberships`, `units`, `reservations`, `notifications`, `sessions`, `invites`, `join_requests`, `stays`, `auth_attempts`, `unit_blocks`, `housekeeping_tasks`, `stay_events`, `leases`, `billing_meter_readings`, `billing_bills`, `billing_bill_items`, `billing_payments`.

`schema_migrations` is the twentieth table and has 11 rows.

## Comparison with Neon Staging

Read-only normalized `pg_catalog` definitions produced identical MD5 fingerprints on Production and Neon Staging (`br-fancy-sky-a1n96vul`):

| Object kind | Count | Fingerprint on both branches |
| --- | ---: | --- |
| Columns | 166 | `d5e5ef089e183ddf65008f79aa7bc8c6` |
| Constraints | 277 | `72280b9c42c6472f42f80bc1cabd0ae5` |
| Functions | 8 | `65a56c9736dcfb084c9bff8054472175` |
| Indexes | 64 | `a8921683707120a8af99d9a829a20fde` |
| Triggers | 10 | `a68fb9bdcf2b7bbc078ea2f678835390` |

Staging history also has the same 11 filenames/checksums. The previously recorded [Neon staging live billing HTTP E2E](P26_NEON_STAGING_SETUP.md) links to successful GitHub Actions run `45024115101`. That E2E was **not rerun** in this Production read-only audit. Production has no E2E fixture data.

## Role, connection security and test limits

- SQL session role was `neondb_owner` (login role, not superuser); StayHub schema ACL was `{neondb_owner=UC/neondb_owner}`. ACL expansion found **0 PUBLIC table grants** in `stayhub`. The owner role can create objects in `public` and `stayhub`; no permissions were changed.
- `pg_stat_ssl` reported **SSL false for this Neon Connector session**. This is a property of the observed connector path. We did not inspect or prove TLS settings of a future Railway-to-Neon application connection, nor expose connection strings or credentials. Require a separate application connection check before cutover.
- `npm run typecheck`: PASS. `npm run build`: PASS (Next.js 15.5.29). Ten local source/arithmetic regression scripts passed: migration contract, ID binding contract, billing migration contract, bill generation, payment recording, bill history, final billing audit, billing UI contract, structure verification and P1 audit. None connected to Production.
- `p27-test-readonly-inventory.mjs` refused execution outside its disposable CI PostgreSQL guard (`REFUSED: disposable CI PostgreSQL only`), as designed. It was **not run as a database integration test here**. No Production SQL mutation was used as a substitute.

## Decision

**PASS for P2.8-B read-only schema, migration, count and definition verification.** Production application connectivity, TLS behavior of its eventual connection, authenticated behavior, rollback and deployment are outside this audit. No Railway `DATABASE_URL` update, Production deploy, merge, data copy or database cleanup was performed.
