# StayHub P4 — Railway Local-First room sync rollout

Date: 2026-11-23 (Asia/Bangkok)

## Scope, immutable UI, and data limits

Continues the user-approved Neon → Railway PostgreSQL cutover on branch `feat/stayhub-p26-readiness`. **No UI, CSS, layout, navigation, text, button, PDF/receipt, business billing logic or Supabase legacy component was edited.** No test records were copied from Neon; the original Neon instance and Railway database remain intact.

**Sync support is limited to property-scoped `units` (room names).** Offline meter readings and bill drafts remain local/queued but are intentionally NOT sent to the cloud. The real billing and payment flows remain server-authoritative and separate from Local-First draft storage. This is not a claim that every business entity has cross-device sync.

## Changes

- `scripts/migrate-production.mjs`: use migration 001–014 on existing Railway Production, but only 001–013 on the old Neon Production fallback. Migration 014's contents and SHA checksum are unchanged to preserve staging migration ledger integrity.
- `app/api/health/db/route.ts`: expect 14 migrations for Railway and 13 for historical Neon Production.
- `lib/db/local-sync-environment.ts`: enforce project/environment/provider identity. Railway Production requires `STAYHUB_LOCAL_SYNC_ENABLED=1`; staging remains explicitly scoped; isolated local test mode cannot enable Production by accident.
- `app/api/v2/sync/route.ts` and `app/api/v2/sync/properties/route.ts`: use the same identity gate. The API still enforces existing cookie session, origin policy, owner/admin membership, property scope, UUID validation, transactional idempotency and revision conflicts.
- `app/api/v2/sync/route.ts`: return revision on successful room saves and conflicts.
- `lib/local-db/sync.ts`: when user elects to keep their local room on a conflict, rebase onto the server revision with a **new** operation ID. Previously queued payloads and local room data are preserved. No forced automatic overwrite.
- `tests/p2b-sync.test.ts`: new IndexedDB conflict rebase test.
- `scripts/test-local-sync-contract.mjs` and `.github/workflows/build-check.yml`: automated contract and local queue tests on CI pushes.

## Rollout status and evidence

- Staging deployment **SUCCESS** at commit `366bbbd4a1ef4f3934eddc50f5bc1f826df76178`, ID `e4a615c4-622d-4ef1-87e6-83602fd75b9a`.
- Production code and migration deployment **SUCCESS** at same pinned commit, ID `fd405ca4-2111-4037-8ad0-6a1d26fa2256`. `/api/health/db` Health Check succeeded, which under this code requires 14 applied migrations.
- `STAYHUB_LOCAL_SYNC_ENABLED=1` applied as a separate Railway Production environment patch after healthy schema deployment. The follow-up deployment ID is `dfcdc09f-7f9c-43ad-a77d-1a6f7d701493`; consult Railway status for its final outcome.
- Production application source is pinned to commit `366bbbd4`: subsequent documentation/branch commits do **not** automatically deploy Production until explicitly promoted.

## Limitations and remaining verification

The CI workflow is configured to run static environment/auth contracts and IndexedDB queue/conflict tests, but no passing GitHub Actions job transcript was retrieved in this session; do not report those tests as passing without evidence. Staging and Production passed their Next.js build and Railway health as described. A fully authenticated two-device browser sync E2E, offline reconnect, user role matrix, and real unit permissions are **not yet independently verified**. User previously requested full UI E2E after migration.

Frontend still contains wording referencing "Staging" in the existing workspace connection UI because the user strictly prohibited UI text/layout changes in this migration. This wording is not an environment configuration; it should be separately reviewed when UI changes are authorized.

## Safe rollback

Disable `STAYHUB_LOCAL_SYNC_ENABLED` or restore a previous successful Railway application deployment if cloud sync causes errors. Preserve the database migration ledger/table contents and existing Railway volume; do not delete migration 014 tables in an emergency rollback. Previous Production code release `74c85fea-7081-41e3-8dc4-988ad27553d7` had 13 migrations and did not expose cloud Local-First sync. Neon is not required for this Railway rollback and must not be destroyed during post-cutover validation.
