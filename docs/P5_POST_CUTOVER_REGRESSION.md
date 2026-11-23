# StayHub P5 — Post-cutover regression preparation and isolated HTTP sync tests

Date: 2026-11-23 (Asia/Bangkok)

## Changes made in the branch

- Corrected stale `tests/local-db.test.ts` expectations from IndexedDB version 2 to current version 3, including the persistent `sync_queue` object store.
- Expanded the existing no-deploy GitHub build/security workflow to include full IndexedDB schema/persistence tests and queue/revision-conflict tests.
- Added the isolated CI-only feature flag `STAYHUB_LOCAL_SYNC_TEST=1` exclusively to `.github/workflows/p26-isolated-http-e2e.yml`. The disposable local PostgreSQL bootstrap refuses all non-loopback database destinations.
- Extended the existing isolated HTTP E2E script to check authorized property listing, anonymous/cross-property rejection, room creation/update, replay idempotency, changed-payload rejection, stale-revision conflict, forbidden deletion, and refusal to turn draft bills into cloud records.

## Verified

- GitHub branch head containing the test changes: `5812eaf59ee6de5714321059a1a245cdc3be1305`.
- Railway Staging successfully built and deployed that head: `fdc1187a-17e8-461d-9ca6-f7150b281616`, `SUCCESS`.
- Railway Production remained online on the prior, explicitly pinned local-sync application release `366bbbd4a1ef4f3934eddc50f5bc1f826df76178`; no new Production configuration, schema changes or deployment in this P5 step.
- The GitHub connector's combined commit status reports successful Railway Staging deployment.

## Still unverified

- The GitHub Actions workflow job results/logs for the new IndexedDB and isolated HTTP assertions were not retrievable from the available connector. Do not mistake Staging Build SUCCESS for a passing isolated CI test run.
- Real, authenticated owner/tenant and two-device browser E2E remain to be performed after this isolated test coverage is verified.
- Production user accounts, property CRUD and the room sync path were not modified with test writes.
- Existing workspace UI labels still mention Staging; those texts are intentionally unchanged due to the user's strict UI/UX preservation requirement.

## Safe next step

Review the GitHub Actions outcomes for `build-check.yml` and `p26-isolated-http-e2e.yml` on commit `5812eaf`. If any fails, fix only the error in the existing branch, do not change Production while validating. Once the isolated API tests are verified, use a dedicated authorized test account to exercise real cross-device sync without affecting unrelated customers. Keep all billing/payment state server authoritative.

## P5.1 — Post-cutover regression follow-up (2026-11-23)

### Applied to existing branch, not Production

- Updated `tests/local-db.test.ts` to expect IndexedDB schema version **3** and the `sync_queue` store. Older version-2 expectations were stale.
- Updated `.github/workflows/build-check.yml` to run **both** persistence and sync tests with `npx tsx --test tests/local-db.test.ts tests/p2b-sync.test.ts`.
- Added isolated-CI-only `STAYHUB_LOCAL_SYNC_TEST=1` for the test HTTP process in `.github/workflows/p26-isolated-http-e2e.yml`. This is not a Railway Production variable and the CI bootstrap refuses any non-loopback PostgreSQL host.
- Extended `scripts/p26-http-e2e.mjs` with tests for unauthenticated access, cross-property denial, allowed-property discovery, room upsert, idempotent retries, stale revision conflicts, rebased update, rejection of unsupported room deletion and non-sync of bill drafts.
- Validation code HEAD for these additions: `5812eaf59ee6de5714321059a1a245cdc3be1305`; subsequently created documentation commits do not affect the Production pin.

### Observed platform state

- Railway Staging successfully deployed validation code at `fdc1187a-17e8-461d-9ca6-f7150b281616` (`SUCCESS`), with the Staging application and database Online during subsequent status checks.
- Railway Production remained Online on pinned source commit `366bbbd4a1ef4f3934eddc50f5bc1f826df76178`, deployment `dfcdc09f-7f9c-43ad-a77d-1a6f7d701493`; there was no P5.1 Production code or variable rollout.
- GitHub connector exposed a successful **Railway Staging status context**, but did not provide GitHub Actions execution logs or passing outcomes for `build-check.yml` and the isolated HTTP workflow. Treat those CI assertions as **added but not independently verified as passing**.

### Two-device data-direction gap

Existing `/api/v2/sync` exposes **POST only**, and `/api/v2/sync/properties` exposes **GET property membership only**. IndexedDB `syncNow` **pushes** queued `units` writes from one browser to the server, but there is no authenticated room-record pull into a second device and no reconciliation of previously synced rooms. **Do not advertise cross-device, bidirectional room sync or successful two-device browser E2E at this stage.** Future implementation needs a property-scoped read endpoint, client-side safe upsert/merge preserving unsent changes, revision/tombstone semantics, and isolated two-client tests before promotion.

### Next safe gate

Confirm actual GitHub Actions CI job pass/fail evidence; fix any failures before promotion. Design and validate the missing server-to-client reconciliation on an isolated database, keeping UI layout, billing and payment behavior unchanged. Do not enable automatic merging or replace the pinned Production deployment without a verified test gate.
