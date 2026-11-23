# StayHub — Railway Production database cutover (2026-11-23)

## Authorization and scope
The user explicitly authorized switching Production to Railway PostgreSQL **without transferring Neon test records**. This was a database target migration, not a declaration that every Local-First Sync feature is ready. No UI/UX components, forms, buttons, CSS, layouts or page routes were modified in this work.

## Target and execution evidence
- Railway project: `a8a5a434-4d18-438f-b4ea-ece072094595`
- Production environment: `c9c4b13a-9041-4ae6-bd50-2d02b546b053`
- App service: `3af8aa8a-2678-47f5-bdf2-aea4fa78c17a`
- Existing PostgreSQL service: `5aa5ca84-dc09-4448-8177-860bcab4ea43` (`Postgres-PDqf`)
- Source branch: `feat/stayhub-p26-readiness`
- Cutover source commit: `a56ca54bec0e3bfd90fd886414b072f2180dec92`
- Successful deployment: `74c85fea-7081-41e3-8dc4-988ad27553d7`
- Production domain (unchanged): `stayhub-production-ac298aeb.up.railway.app`

Railway app variables were switched/staged to `STAYHUB_DB_PROVIDER=railway`, the existing Railway PostgreSQL service's `DATABASE_URL` reference, and `STAYHUB_WRITE_FREEZE=NO`; the patch was applied by `accept_deploy`. No credential values were printed or stored in Git. The production app was pinned to the verified commit for this cutover so the source cannot silently drift. **Important: this pin blocks automatic rollout of later branch commits until source pinning is explicitly removed**.

The code fix in `scripts/migrate-production.mjs` excludes migration `014_local_sync.sql` because its source declares it staging-only; the Production health check requires exactly 13 migrations.

## Observed outcome (Railway)
- Deployment status: **SUCCESS**; healthcheck path: `/api/health/db`.
- Application: **Online**, 1/1 running replica, no active warning/critical reported.
- PostgreSQL service: **Online**, existing persistent volume retained.
- Pre-deploy logs: `Production DB environment and identity verified (no credentials disclosed)`.
- Pre-deploy migration logs: `SKIP 001`–`011`, `APPLIED 012_operational_modules.sql`, `APPLIED 013_repair_workflow.sql`.
- Next.js build passed and server reported Ready.
- Migration 014 was not applied to Production.

## Data decision
At P1.4 the Railway Production database had zero business rows in its 19 business tables and 11 migration records. Neon Production had seven non-ledger tables with one row each and 13 applied migrations. The user identified Neon records as **test data**, explicitly chose not to transfer them. Neon database/project/branches were **not** deleted or modified.

As a result, old Neon test accounts/sessions/properties/rooms do not appear in the new Railway environment. Fresh accounts/properties may need to be created on Railway. Do not describe this as a loss of migrated customer data.

## Incomplete follow-up work
- The Local-First `/api/v2/sync` and `/api/v2/sync/properties` routes still gate sync to Neon Staging. Railway Production cutover does **not** yet enable cross-device Local-First sync; change these guards and review migration 014 authorization before enabling this feature.
- Browser E2E across all Owner, Tenant, and Platform Admin features is intentionally postponed at user's request.
- Existing legacy Supabase callsites are not removed by the PostgreSQL provider cutover; review their actual use before claiming every Neon/Supabase dependency is eliminated.
- Runtime secret values are redacted by Railway OAuth; deployment metadata, applied migrations and successful database healthcheck are the evidence of the Railway switch.
- Resume automatic branch deployments by removing the commit SHA source pin in a controlled next release.

## Rollback
The previous successful Railway app deployment was `2f4d7118-9729-4f34-bfb5-0523048f1be8` from commit `fedc125761369ad61f874c754ae23ac049266b7a`. The Neon Production database and connection variable names were retained. A rollback **must** restore the prior `STAYHUB_DB_PROVIDER=neon-production` and appropriate URL binding along with a compatible prior deployment; merely redeploying an old app artifact against the new Railway database does not revert the database target. Railway migration 012–013 created schema only and should be left intact unless an explicit reviewed rollback calls for changes.

No production data deletion, Neon deletion, new database or UI changes were performed.
