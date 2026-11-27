# StayHub P2.5-B — Billing database handoff

Date: 2026-11-22. Scope: migration 010, server-side identity types/lookups, static contract tests. No API or UI changes. No migration executed against staging, production or Neon; no deploy or merge.

## Baseline and source review

- Remote branch HEAD on start: `52c4f4bba11175385052867b35136c06a81a897a`; clean detached worktree based on this exact commit. The original checkout contained a prior local-only P2.5-A commit `ab34de3` (the same document already uploaded separately as remote `52c4f4b`); original worktree was preserved unchanged, without reset or clean.
- Read all of `docs/P25A_LOOKHOME_REUSE_PLAN.md` and migrations 001–009. Migration 007 already establishes `stays(property_id,id,account_id,unit_id)` uniqueness and the lease FK to that tuple. Migration 010 adds a unique lease tuple including lease ID before creating the invoice FK. Existing tables/data are not dropped or backfilled.
- `components/AdminBillBuilder.tsx` and `components/MeterEntryWorkspace.tsx` currently use browser Supabase tables `invoices`, `invoice_items`, `meter_readings`, `rooms` and `leases` with legacy tenant/room IDs. They are **not** wired to these PostgreSQL tables and must remain untouched until a later UI phase. The old invoice upsert and delete/reinsert behavior is incompatible with finalized immutable bill snapshots.

## Migration 010

`db/migrations/010_billing_identity.sql` creates four tables under `stayhub`: meter readings, bills, bill items and manual payments. Every monetary amount is a nonnegative numeric fixed-point value; payment must be positive. Month is a first-of-month date. Previous meter value is required explicitly, even for the first month; generated usage and amount cannot drift from the stored readings and unit price. A unique room/type/month key separates periods and prevents duplicates.

Bill identity `(property,lease,stay,account,unit)` references the existing lease identity; lease already references the verified stay identity. Bill uniqueness is `(property,lease,period,bill_type)`. Payment has a composite `(property,bill)` FK and unique `(property,idempotency_key)`. Item has a composite bill FK including property/unit/period; its optional meter reference includes property/unit/type/period, and a reading may appear on one item only. `water`/`electric` items must reference readings; `rent`/`other` must not.

The bill is created with `finalized=false`, its item snapshots are inserted, and it must be finalized in the **same transaction**; the deferred trigger verifies `finalized=true`, rent item exists, and item sum equals bill total at commit. After finalization, item insert/update/delete and bill snapshot edits/deletion are blocked. Used meter readings and payment records cannot be updated or deleted directly. A manual payment insert locks its bill and updates `partial`/`paid` after checking cumulative amount; bill voiding after payment is blocked. Invoice insertion checks active lease and its effective month against Stay dates. Utility insertion requires exactly one overlapping Stay in that room during the entire month, and that stay must be the bill's stay. The unit row is locked to align with assignment/transfer logic.

`lib/db/billing-identity.ts` gives future server endpoints a property-filtered, locked lease/stay identity lookup and an exclusive-monthly-Stay check. **These helpers do not authorize the caller:** future endpoints must first check session and owner/property membership or tenant account. Never accept account/unit/stay from request bodies when issuing a bill.

## Verification and remaining gates

`scripts/test-billing-migration-contract.mjs` checks the critical SQL composite keys, locks, uniqueness, snapshot guards, and identity helper without connecting to a database. `npm run test:migration`, `npm run test:id-binding`, `npm run test:structure`, `npm run typecheck`, and `npm run build` are run locally; see task report for results. Static checks do **not** prove PostgreSQL executes trigger functions correctly.

No separately verified PostgreSQL test database was available. Do not substitute Railway staging. Before P2.5-C, run migration 001–010 in an isolated empty PostgreSQL test database and transaction-only tests for Account A/B, Property A/B, distinct months, duplicate meter/bill, cross-property payment, negative amounts, immutable snapshots, invalid first reading, payment overrun and repeated idempotency keys, transfer/shared room, terminated lease and migration from an existing 001–009 dataset. Roll back test fixtures and verify migration ledger. Confirm SQL parsing and transaction behavior before any staging migration.

## Deployment gate

Railway Staging service `StayHub-F_Sd` is configured with GitHub source branch `feat/stayhub-p1-security-staging-audit` and `checkSuites=false`, so a push can trigger an automatic deployment. The production service configuration and all environment settings must be preserved. Do not push while automatic deployment is active unless a verified non-deploying guard is enabled first. No deployment is authorized until P2.5-A through P2.5-F pass and the owner explicitly approves. The 15-room free policy is unrelated to these billing tables; no room-limit or subscription logic is included.
