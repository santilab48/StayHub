# StayHub P5.4 Production release status

Date: 23 November 2026 (Asia/Bangkok)
Status: **BLOCKED — no Production promotion performed**

## Release candidate and repository

- Candidate commit: `d163b4d167f8686e8015c8797d5eb0bdcc635c17` on `feat/stayhub-p26-readiness`. Local and remote HEAD matched before this report was written. Working tree was clean.
- User supplied current Production source commit: `366bbbd4a1ef4f3934eddc50f5bc1f826df76178`. `docs/P53_ISOLATED_BROWSER_E2E.md` also recorded that commit as the Production source at the time of P5.3. This task could not independently recheck the live Railway deployment.
- `git diff 366bbbd4..d163b4d -- db/migrations` is empty. The candidate changes room sync API/client logic, isolated tests, CI/build checks and documentation. The `railway.json` build command now runs the sync contract and IndexedDB tests before `npm run build`. No new migration file is in the candidate difference.
- Draft PR #2 was not merged.

## P5.3 verification reviewed

`docs/P53_ISOLATED_BROWSER_E2E.md` records these completed checks for the candidate history:

| Check | Recorded result |
|---|---|
| Build/security workflow | SUCCESS, GitHub Actions run `45136280389`, including typecheck and Next.js production build |
| Isolated PostgreSQL and HTTP integration | SUCCESS, run `45136280386`, job `137563233139`; 14/14 migrations applied to disposable CI PostgreSQL |
| Two real Chromium contexts | PASS for room transfer A→server→B, offline conflict, rebase, B→server→A and IndexedDB persistence |
| Railway Staging build gate | Recorded as passing 12/12 tests |

These are previously recorded test outcomes. This task did not rerun them. They cover isolated CI and Staging, not the required live Production release checks.

## Production configuration and database gate

**BLOCKED.** This execution environment has no Railway CLI, Railway Production variable binding, `DATABASE_URL` binding or database access. The HTTPS GET to `https://stayhub-production-ac298aeb.up.railway.app/api/health/db` failed at the network proxy with `CONNECT tunnel failed, response 403` and HTTP `000`. No Railway management connector is available in this task.

The repository's `lib/db/postgres.ts` selects `DATABASE_URL` unless `STAYHUB_DB_PROVIDER` selects an approved Neon environment. That code does not prove which variables the running Production app currently holds. The Railway PostgreSQL target, exact `DATABASE_URL` binding, Production app status and PostgreSQL Online status remain **unverified now**. The historical P4 rollout report recorded the existing Railway PostgreSQL and a successful healthcheck at its release time.

## Migration status

The repository contains migration 001–014, and no migration changed between the user-supplied Production commit and the candidate. `docs/P4_RAILWAY_LOCAL_SYNC_ROLLOUT.md` recorded a previous Production pre-deploy check that skipped 001–014 because they were already installed. Current migration ledger/checksums, schema and database target could not be read in this task. **Current Production migration status is BLOCKED**, and no migration was run.

## Deployment, health and rollback

- Deployment attempted: **no**. The required live configuration/database checks could not be completed, so promotion stopped before any Railway mutation.
- New deployment ID: **none**.
- Health check and deployment logs for a new release: **unrun**.
- Historical rollback reference: `docs/P4_RAILWAY_LOCAL_SYNC_ROLLOUT.md` records Production deployment `dfcdc09f-7f9c-43ad-a77d-1a6f7d701493` at source commit `366bbbd4`. Its current availability and the current configuration values have not been verified. No configuration was copied or changed.
- Production app and PostgreSQL Online now: **unverified**.

## Required checks before a later promotion

1. Obtain authorized read-only access to Railway Production project `a8a5a434-4d18-438f-b4ea-ece072094595`, environment `c9c4b13a-9041-4ae6-bd50-2d02b546b053` and app `3af8aa8a-2678-47f5-bdf2-aea4fa78c17a`. Verify the current deployment ID/source commit, existing variables by name and target identity without disclosing secrets, and the original configuration needed for rollback.
2. Verify the Production PostgreSQL service identity and read migration 001–014 ledger/checksums. Confirm both app and database are Online and `/api/health/db` is healthy before promotion.
3. Promote the exact tested code commit `d163b4d167f8686e8015c8797d5eb0bdcc635c17` to the existing Production app only after the preceding gates pass. Preserve the previous successful deployment as a rollback reference.
4. Inspect new deployment logs, migration check results, `/api/health/db`, app and database status. On failure, stop promotion and restore the previously verified deployment/configuration. Do not infer success from a build alone.

No UI/UX, business logic, database, Production variable, Production deployment or PR merge was changed in this task. This report documents a blocked release, not a successful Production rollout.
