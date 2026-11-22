# StayHub P2.7-B — PostgreSQL Backup / Restore Rehearsal

Date: 2026-11-22 (Asia/Bangkok)
Branch: `feat/stayhub-p26-readiness`
Status: **PASS: isolated PostgreSQL 18 backup-and-restore rehearsal. Railway Production backup: NOT YET VERIFIED.**

## Controlled automated test

Source: disposable PostgreSQL 18 database `stayhub_p26_ci`.
Destination: **separate, empty** PostgreSQL 18 database `stayhub_p27_restore`.
Both run in a single temporary GitHub Actions PostgreSQL service container and are deleted when the job ends.

- Pipeline: `.github/workflows/p27-backup-restore.yml`.
- Driver: `scripts/p27-ci-restore-smoke.mjs` with explicit CI-only, exact local source/destination guards.
- Apply migrations 001–011 to source via `scripts/p26-ci-migrate.mjs`.
- Create synthetic account, property, owner membership, unit (with foreign-key links).
- Create complete PostgreSQL custom-format backup with `pg_dump --format=custom --no-owner --no-acl`.
- Inspect archive with `pg_restore --list`.
- Restore with `pg_restore --single-transaction --exit-on-error --no-owner --no-acl`.
- Verify exact row counts for **all 20 StayHub tables**, migration history/checksums **11/11**, schema constraints/foreign keys, and recovered fixture account.

[GitHub Actions run 45025071348 — SUCCESS](https://github.com/santilab48/StayHub/actions/runs/45025071348).

## Important failure caught and fixed during rehearsal

1. Runner installed PostgreSQL **18** client, while initial fixture server used PostgreSQL **16**. This produced unsupported `transaction_timeout` setting in the restore. **Fixed** by matching PostgreSQL 18 source and restore versions.
2. `pg_dump --schema=stayhub` omitted public extensions such as `btree_gist`, which a UUID/GiST exclusion constraint depends upon. The restore failed with "data type uuid has no default operator class for access method gist". **Fixed** by backing up the entire database, including extensions, instead of only the `stayhub` schema.
3. Re-run with PostgreSQL 18 and a full-database custom-format archive: **SUCCESS**.

These are concrete requirements for the actual migration. For production, inspect source extensions and destination version before a snapshot/export. Avoid restoring into a non-empty database, particularly Neon staging that already holds live synthetic E2E records.

## Production source audit (still blocked)

Railway Production `Postgres-PDqf` has persistent volume `postgres-volume-zENI` (500 MB provisioned). Railway Production app and Postgres service are SUCCESS, but the accessible connector **does not provide direct SQL execution, raw credentials, or backup enumeration**. Its absence of a backup listing is **not** proof that Railway has no backups.

Therefore the following remain **unverified**:
- Whether Railway's own snapshots or automated backups exist and are restorable.
- Exact Railway Production table row counts and data size.
- A full actual `pg_dump` from Railway Production.
- An actual restore of Production data into a new isolated Neon migration rehearsal branch.
- The ability to rewind/replay changes after initial dump (cutover/write freeze, logical replication or controlled delta migration).

## Required gate before Production cutover

1. Obtain an authorized, read-only access path to Railway Production PostgreSQL and run `scripts/p27-readonly-inventory.mjs`.
2. Verify a recoverable source backup with its creation time and retention. Validate recovery on an isolated destination, not on the source.
3. Export a full database archive **including extensions** with a compatible direct PostgreSQL client, using a secure transfer path. Do not commit archive files or credentials.
4. Restore into an **empty dedicated Neon migration rehearsal branch/database** (not production or existing test staging). Validate row counts, constraints, checksums, billing payment totals and authorization.
5. Record freeze/delta cutover plan, rollback with precise point-in-time and credentials, then seek explicit approval for Production switch.

**No Railway Production database or app variables changed. No Neon Production schema or data changed.**
