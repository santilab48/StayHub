# StayHub P2.7-A — Production database inventory / migration gate

Date: 2026-11-22 (Asia/Bangkok)
Branch: `feat/stayhub-p26-readiness`
Status: **PARTIAL: infrastructure and Neon verified; production row counts not yet available**

## Verified inventory

| System | Evidence |
|---|---|
| Railway Production app | `StayHub`, service `3af8aa8a-2678-47f5-bdf2-aea4fa78c17a`, deployment `81338194aec3d3bd646e6bbe51215ffb9eb530dc`, SUCCESS |
| Railway Production PostgreSQL | `Postgres-PDqf`, service `5aa5ca84-dc09-4448-8177-860bcab4ea43`, separate persistent volume `postgres-volume-zENI` |
| Production migration hook | `node scripts/migrate-production.mjs`; previous deploy logs verified checksums and skipped 001–011 as already applied |
| Railway connection variables | Production app has `DATABASE_URL`, `STAYHUB_DATABASE_ROLE`, and auth feature flags; OAuth connector exposes variable NAMES only, not credentials |
| Neon project | `late-darkness-78944075` (`stayhub-db`) |
| Neon staging | `br-fancy-sky-a1n96vul`, 20 StayHub tables, 11 migration history records, live Auth/QR/Billing HTTP E2E passed |
| Neon production | `br-snowy-tree-a1kt7omx`, **0 StayHub tables**; no schema or data migration performed |

## What was not verified

Railway Connector does not offer direct arbitrary SQL for Production; it also redacts database connection values in this account. There are no existing environment forks suitable for executing a read-only inventory. Therefore **no accurate production table-by-table row counts or data dump is available from this audit**. An online service status and successful migrations do not establish the number of business records.

## Prepared read-only production inventory

`scripts/p27-readonly-inventory.mjs` was added to the feature branch. It:

- Requires explicit `P27_READ_ONLY_AUDIT=YES`, the exact Railway Production project/environment identity, and `STAYHUB_DATABASE_ROLE=production`.
- Rejects any database name other than `railway`.
- Uses `REPEATABLE READ READ ONLY` with a 10-second statement timeout.
- Reads names, checksums, and counts for every `stayhub` table.
- Prints counts and migration metadata only — not row contents, connection strings, user emails or passwords.
- Does **not** run automatically during deployment.

Execute only in an authorized trusted shell with access to the already-configured Railway Production `DATABASE_URL`:
```bash
P27_READ_ONLY_AUDIT=YES node scripts/p27-readonly-inventory.mjs
```
The exact Railway environment variables must be available to the process; this command intentionally refuses generic/local environments.

## Decision and next steps

**NO-GO for production cutover or data copy.** First obtain production table counts and an approved, recoverable snapshot/backup. Then compare exact migration checksums on the source/target, use a temporary Neon branch (not the empty production branch or the existing live E2E staging branch), perform a rehearsed data transfer with verified row counts, foreign keys, payments and session handling, and confirm rollback.

No production variables or databases were modified and no Railway volume was deleted.

## Inventory script verified in CI (2026-11-22)

- Workflow: `.github/workflows/p27-inventory-contract.yml`.
- Test fixture: `scripts/p27-test-readonly-inventory.mjs`.
- [GitHub Actions: SUCCESS](https://github.com/santilab48/StayHub/actions/runs/45024711585).
- Disposable PostgreSQL 16 in CI with database named `railway` (an intentional **mock** of the Railway Production database name, not a connection to Railway).
- Passed: exact per-table counts and migration history; no account emails printed; missing opt-in refused; wrong environment refused; staging role refused; fixture data unchanged after audit.
- The initial `npm ci` workflow failed because the repository has no committed lockfile; fixed to `npm install --no-audit --no-fund` and reran successfully.

**Important:** A PASS here proves the inventory command's behavior and guardrails on a disposable database. It does **not** establish the row counts in the real Railway Production PostgreSQL. The real inventory is still pending an approved trusted execution path with the existing Production DATABASE_URL.
