# StayHub P2.5-F — final backend billing audit and handoff

Date: 2026-11-22 (Asia/Bangkok)

## Source and preservation

Recovered the actual P2.5-B–E source from the user-provided ZIP and Git bundle in a **separate local review repository**. Verified `git bundle verify` and the ancestry `52c4f4b → 06b665f → 54c7fcf → 7341de1 → 3bd5740`. The user's original cloud workspace was not modified. The export's uncommitted `next-env.d.ts` patch remains only in the supplied ZIP and was not applied to or overwritten in the review checkout. No GitHub push, Railway action, database migration, or deploy took place.

## Implemented backend

- 010: `billing_meter_readings`, `billing_bills`, `billing_bill_items`, `billing_payments`; composite identity FKs, unique property/lease/period and property/unit/meter/period keys; deferred bill total check; immutable finalized snapshots and payments; payment lock/status trigger.
- 011: immutable bill issue idempotency key and request hash.
- POST `/api/v2/meter-readings`: meter baseline, prior reading, non-decreasing usage, fixed-point amount, property owner/admin permission.
- POST `/api/v2/bills`: active lease, stored account/stay/unit identity, meter snapshots, monthly rent and optional other charge, idempotency.
- GET `/api/v2/bills`, GET `/api/v2/bills/[billId]`, GET `/api/v2/bills/summary`: paginated tenant-account or owner-property scoped history, detail and simple summary.
- GET/POST `/api/v2/bills/[billId]/payments`: manual cash/transfer recording with bill-row lock, partial/full balance and replay-safe idempotency; tenant view has restricted fields.
- Old Supabase-backed billing UI is **not connected** to these new PostgreSQL endpoints. Do not announce that billing is available end-to-end from the UI.

## P2.5-F change

Corrected `billing_guard_meter_update()` in migration 010: for an **unbilled** reading, the BEFORE UPDATE trigger previously returned `OLD`, silently suppressing a permitted update. It now returns `NEW` on UPDATE; billed readings are still rejected. No executed migrations are affected because 010 has not been applied on an authorized environment. Added `scripts/test-billing-final-audit.mjs` to catch regression of this bug and review source-level session, cache and payment guards.

## Tests performed in this review environment

| Check | Result |
| --- | --- |
| Git bundle verification and 4 local phase commits | PASS |
| `node scripts/test-billing-migration-contract.mjs` | PASS (static) |
| `node --experimental-strip-types scripts/test-bill-generation.mjs` | PASS (calculation/static) |
| `node --experimental-strip-types scripts/test-payment-recording.mjs` | PASS (calculation/static) |
| `node scripts/test-migration-contract.mjs` | PASS (static) |
| `node scripts/test-id-binding-contract.mjs` | PASS (static) |
| `node scripts/verify-structure.mjs` | PASS (static) |
| `node scripts/test-billing-final-audit.mjs` | PASS (static) |
| `node scripts/test-bill-history.mjs` | NOT RUN: npm `typescript` package absent in review environment |
| `npm run typecheck`, `npm run build` | NOT RUN HERE: dependencies not installed in review environment; prior P2.5-E report says passed on original workspace |
| Migrations 001–011, trigger behavior, real HTTP and concurrency | **NOT VERIFIED**: no confirmed isolated PostgreSQL test database |

Do **not** treat static tests or historical build reports as evidence of PostgreSQL integration passing.

## Release blockers

1. Provision an independently confirmed disposable PostgreSQL test DB, separate from Staging, Production and Neon, then execute migrations 001–011 in order using an appropriate test runner. Verify SQL functions/triggers and migration bookkeeping; test upgrades from 001–009 fixtures.
2. Test owner/property isolation and old-tenant/next-tenant bill reads using actual HTTP sessions; test meter duplicate/decrease and first baseline; duplicate monthly bills; immutable snapshot; 2 simultaneous payments, replay and changed-payload conflicts; partial/full/overpay and rollback.
3. Install dependencies in a disposable local environment, run typecheck/build and all static/regression tests including `test-bill-history.mjs`.
4. Decide how to release backend-only billing: current billing UI still targets legacy Supabase data; user-visible billing is **not** migrated to the new PostgreSQL flow.
5. Owner controls Git push and deployment. Railway Staging tracks `feat/stayhub-p1-security-staging-audit` with Auto Deploy, so do not push to that branch as a non-deploying preparatory step while Auto Deploy remains on. No staging/production migration, merge, Neon changes or deploy authorized by this audit.

## Deployment and rollback notes for owner

Only after blockers pass and explicit owner approval: plan an isolated schema backup and maintenance window, confirm exact target environment and database URL without exposing secrets, run the migration sequence once using the existing migration ledger, inspect migration/trigger results and API health, then activate a controlled build. For code rollback, restore the last known stable image and keep the new additive billing tables intact; database `DROP TABLE` rollback would destroy records and is **not** recommended. No irreversible automatic migration hook was introduced.

Scope excludes payment gateway, PDF, tax, PRO quota, device limit, R2 sync and UI redesign.
