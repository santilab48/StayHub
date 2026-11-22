# StayHub P2.7-C — Restore consistency verification

Date: 2026-11-22 (Asia/Bangkok).
Branch: `feat/stayhub-p26-readiness`.
Status: **CI PASS for isolated PostgreSQL 18 source/restore consistency, NOT a Production migration.**

## Implemented

- `scripts/p27-ci-compare-restored.mjs` compares disposable CI PostgreSQL source `stayhub_p26_ci` against restored `stayhub_p27_restore`, using transaction-level `REPEATABLE READ READ ONLY` and no row-level PII output.
- Explicit environment guards reject non-CI, missing `P27_DISPOSABLE_RESTORE=YES`, or connection strings other than the two predefined localhost CI databases.
- `.github/workflows/p27-backup-restore.yml` runs a **full** database dump including extensions, restores onto a separate empty database, then invokes the comparator.
- Comparator verifies identical table names, exact counts for 20 tables, 11 migration filenames and checksums, extensions/versions, constraint definitions, indexes, `billing_bills` counts and amount/paid totals, and `billing_payments` counts and sums.
- A deliberate extra account inserted into restored destination must cause a nonzero comparator exit, proving differences fail closed.

## Evidence

[GitHub Actions run 45025607241: SUCCESS](https://github.com/santilab48/StayHub/actions/runs/45025607241).

Relevant log assertions:
```
PASS restored exact row counts across 20 StayHub tables
PASS restored migration history and checksums (11/11)
PASS all restored database constraints and foreign keys
PASS tables dataset comparison
PASS rows dataset comparison
PASS history dataset comparison
PASS extensions dataset comparison
PASS constraints dataset comparison
PASS indexes dataset comparison
PASS payments dataset comparison
PASS bills dataset comparison
PASS comparator rejects a tampered destination
```

## Strict release gates still open

1. Railway Production database: **SQL access and actual row counts remain unavailable** via current OAuth connector. Do not treat the CI fixture as actual customer data.
2. Railway Production: confirm restorable database backup and securely obtain a full database dump, preserving `btree_gist` and all dependent extensions.
3. Rehearse the actual Production data on a new **empty** Neon branch/database; do not restore over existing Neon staging (live test records) or Neon production.
4. Compare exact table counts and migration checksums, plus billing totals, constraints and required indexes. This CI-only comparator is not a live Production comparison tool.
5. Approve cutover only after source write freeze, data consistency checks, rollback process and credentials are reviewed.

No Production variables, tables or deployments were changed during this work. The comparison is a reusable verified testing pattern, not proof that Railway Production data was transferred.

## P2.7-D: production-source audit strengthened (2026-11-22)

- `scripts/p27-readonly-inventory.mjs` now captures billing **aggregates only**: total bill rows/amount, paid bill rows and payment rows/amount, plus installed PostgreSQL extension names and versions. It continues to use `REPEATABLE READ READ ONLY` and exact Railway production environment gates. No customer record contents are printed.
- `scripts/p27-test-readonly-inventory.mjs` now creates a disposable billing fixture: one paid bill of 4,350.00 THB and two payments of 1,500.00 + 2,850.00 THB. Test verifies aggregate totals, extension metadata, unchanged test records and all negative environment guards.
- [GitHub Actions inventory test 45025888978: SUCCESS](https://github.com/santilab48/StayHub/actions/runs/45025888978).
- Verified Railway Production currently exposes no public TCP proxy for PostgreSQL; **none was created**. Its Production DB is still not accessible for arbitrary SQL through the connector.
- Attempting an explicit Neon snapshot of child `staging` failed with `not allowed to snapshot non-root branch` (HTTP 400). This does not affect the live database. No snapshot was claimed or created.
- These additions prepare evidence collection, but **Railway Production exact counts and verified source backup are still missing**. Therefore do not restore data into Neon production or modify Railway production settings.
