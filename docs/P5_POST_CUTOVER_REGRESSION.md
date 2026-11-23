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
