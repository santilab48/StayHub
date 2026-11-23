# StayHub P5.2 — Railway → IndexedDB room pull

Date: 2026-11-23 (Asia/Bangkok)

## Scope

The existing button **ซิงก์ตอนนี้** now runs outbound queued room changes and then reads an authenticated, paginated room snapshot from Railway into the same local workspace. **No UI text, labels, components, layouts, CSS, billing or payment files were modified.** This remains **room-only** sync; offline meter readings and draft bills never become issued server bills through this route.

## Server pull design

- `GET /api/v2/sync?propertyId=<uuid>&after=<uuid>` (existing route, now also GET).
- Explicit Railway environment/feature gate, signed-in account and `canManageProperty` owner/admin authorization on **every page**.
- Bounded pages (100 rooms, one extra row for next cursor), ascending UUID cursor; only active units; returns `id`, `name`, `revision` and `nextCursor`.
- Revision derives from `stayhub.local_sync_revisions`, falling back to 1 for pre-existing rooms. No new DB migration needed, no destructive SQL.
- Invalid UUID cursor or property rejected. No unauthenticated or cross-property data return.

## IndexedDB reconciliation

- `pullServerUnits()` requests up to 100 pages, rejects malformed responses and repeated cursors.
- `mergeServerUnits()` atomically imports/refreshes each validated page into the **existing** `units` object store; new records use stable server unit UUID with the local workspace's property ID.
- A per-room last-acknowledged server baseline is held in the existing `workspaces` object store under `sync-room:<localPropertyId>:<unitId>` (revision, name, linked server-property ID). No IndexedDB version upgrade is necessary.
- Any pending/syncing/failed/conflicted/cancelled local unit operation **blocks overwriting that room**.
- An existing local unit with no trusted server baseline is preserved, not overwritten. Different linked server-property IDs cannot rewrite each other's recorded baseline. Acknowledged unchanged units may safely accept fresher server revisions.
- Cross-workspace UUID collisions reject the entire page. Offline drafts, payments and other stores are not changed.
- `app/workspace/page.tsx` rechecks linked account + property authorization before triggering pull after push.

## Test coverage added (results must be independently verified)

- `tests/p2b-sync.test.ts`: import from remote, repeated pull/revisions, preservation of unsent local edits, pagination, reject invalid remote entries and cross-workspace IDs.
- `scripts/p26-http-e2e.mjs`: authorized GET, anonymous 401, other-owner 403, bad cursor 400 and returned server revision under an isolated localhost PostgreSQL CI fixture.
- `scripts/test-local-sync-contract.mjs`: static checks for property scope, bounded pages and local baseline safeguards.
- GitHub Actions workflow configuration already runs isolated HTTP and IndexedDB tests; **Railway Staging Build success does not prove these test cases passed**.

## Release gate and rollback

Do not call this two-device browser E2E verified until the isolated workflows pass and a real browser-to-browser sync is tested. Production app remains pinned to previous commit `366bbbd4a1ef4f3934eddc50f5bc1f826df76178` and **P5.2 code is not yet live in Production**. Continue using Stage until CI outcomes are verified. To roll back P5.2 in a subsequent deployment, revert the GET/merge/button-handler changes; no database migration or destructive data reversal is required. Existing device local baselines should be treated as benign metadata and left intact.

## Staging build-time test gate (P5.2)

The repository's `railway.json` now defines a build command that first executes the sync contract and IndexedDB regression tests, and runs the Next.js build **only if they pass**. Railway reads this repository file ahead of any environment-specific dashboard build command:

```sh
node scripts/test-local-sync-contract.mjs && npx tsx --test tests/local-db.test.ts tests/p2b-sync.test.ts && npm run build
```

This file-level build gate applies to future builds from this branch, not only Staging. The **currently running Production image remains pinned** to old commit `366bbbd4`, and Production was not deployed in P5.2. The isolated HTTP test workflow continues to be configured via GitHub Actions and is a separate verification gate.

### Staging execution evidence

- First gated build `fb841afb-553b-43f8-849c-072356b7cbdd` failed appropriately: 10/11 tests passed; one stale test expectation was corrected without making unsafe production changes.
- Second gated build and deployment `081b31c6-5647-4446-a712-fe456977c2f4` completed **SUCCESS** at code commit `a722a664b0fa8c58b8cd2ddace162cbb524c9e64`.
- Build log explicitly shows **11 tests, 11 passes, 0 failures**, including previously failing server-pull test, followed by **Next.js compiled successfully**, type validation and healthy Staging deployment.
- This proves the local IndexedDB and static sync-contract regression suite ran, but does **not** prove isolated PostgreSQL HTTP GitHub Actions passed or a real two-device browser E2E completed. The latter are still required before Production promotion.
