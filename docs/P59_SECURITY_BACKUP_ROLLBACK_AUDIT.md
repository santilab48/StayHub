# StayHub P5.9 — Security, Backup and Rollback audit

Date: 2026-11-23 (Asia/Bangkok)

## Verdict

**PARTIAL PASS.** Application identity/sync authorization, encrypted local backup/restore and release rollback references have been verified. **Railway Production PostgreSQL point-in-time backup or tested restore has NOT been verified**, so full disaster-recovery readiness must not be claimed. No Production mutation/deploy/rollback occurred in this audit.

## Live Railway evidence (authorized read-only management)

Project `a8a5a434-4d18-438f-b4ea-ece072094595`; environment `c9c4b13a-9041-4ae6-bd50-2d02b546b053`.

- App service `StayHub` (`3af8aa8a-2678-47f5-bdf2-aea4fa78c17a`): **Online**, 1/1 replicas, 0 crashed, 0 warnings, 0 critical issues.
- PostgreSQL service `Postgres-PDqf` (`5aa5ca84-dc09-4448-8177-860bcab4ea43`): **Online**, 1/1 replicas, 0 crashed, 0 warnings, 0 critical issues.
- PostgreSQL persistent volume `postgres-volume-zENI`, id `4bd9d39f-ea2f-42a8-a067-8116323f7174`, mounted at `/var/lib/postgresql/data`, configured size **500 MB**. **A persistent volume is not equivalent to an off-site backup**.
- Active app deployment `173c27ab-cd5a-4e04-a611-a6c8c1cf42f5`: **SUCCESS**, `canRollback=true` reported by Railway. Source config pinned `d163b4d167f8686e8015c8797d5eb0bdcc635c17`. Deployment metadata SHA `dd097dfb91f99545c477290094b8e6a97646e002`; these fields differ and must not be conflated.
- Previous deployment `dfcdc09f-7f9c-43ad-a77d-1a6f7d701493` at `366bbbd4a1ef4f3934eddc50f5bc1f826df76178` is listed **REMOVED** yet `canRollback=true` in Railway deployment metadata. This is a **rollback reference**, not proof of an exercised restore. No rollback was executed.
- No staged Railway config/volume changes in Production; no forks listed.
- Production deployment logs demonstrate guarded database environment identity verification, `SKIP 001–014` for already applied migrations, and `[1/1] Healthcheck succeeded!`. No new live SQL migration-ledger read or DB restore test was performed.
- Railway exposes Production variable names including `DATABASE_URL`, `STAYHUB_DB_PROVIDER`, `STAYHUB_DATABASE_ROLE`, `STAYHUB_LOCAL_SYNC_ENABLED`, `STAYHUB_WRITE_FREEZE`, but **redacts values**; do not infer their current values solely from the names. Guarded migration/health logs are additional evidence of last successful launch.

## Security boundaries reviewed

- HTTP API authentication uses server-side sessions with `HttpOnly`, `SameSite=Lax`, and `Secure` in Production. Owner/Admin property permissions are evaluated on the server, and request mutators require origin checks.
- Local-First room-sync features are environment-gated, property-scoped and idempotent; bill drafts and meter readings are intentionally excluded from room sync. GitHub isolated PostgreSQL HTTP and Chromium suites have passed earlier P5.3–P5.8 regression.
- Service Worker does not cache `/api/`, `/cloud`, or `/platform` pages (P5.8 Chromium E2E).
- Platform Super Admin remains deliberately disabled. No global-admin access was provisioned or enabled by P5.9.
- No credential values were exposed, no access control was loosened, no Production service/database/volume was changed.

## Real defect fixed: encrypted backup and synced-room metadata

`lib/local-db/backup.ts` did not recognize `sync-room:<localWorkspaceUUID>:<unitUUID>` metadata created by recent server-to-device room pull. An encrypted backup containing such metadata could fail validation. P5.9 extends the existing trusted workspace-key allowlist to include only the new per-room sync-baseline key shape; no schema migration or UI change.

Added `tests/p59-backup.test.ts` executed in the ordinary Build/Security workflow. Its fake-IndexedDB round-trip:

1. Creates an offline room, water reading, bill draft and three pending operations; links a test server property and imports a server room with revision 2.
2. Creates a PBKDF2-SHA256 (310,000 iterations)/AES-256-GCM encrypted `.shbackup` and verifies sensitive local draft text and remote room UUID are not present as plaintext.
3. Inspects correct record counts including both rooms and pending sync metadata.
4. Rejects wrong backup password and tampered ciphertext.
5. Refuses destructive restore unless explicitly confirmed; verifies local data is unchanged after refusal.
6. After confirmed test-only restore, verifies all offline drafts, queued operations and the pulled room persist; entries created after snapshot are correctly replaced.
7. Verifies the property link is **not automatically trusted after restore**; user must re-authorize the server property before further sync.

## CI evidence

- Tested changes: `30d3f19ce397b7b2f513e57c108d83a10fc9765d` (fix), `f901761b01fd252c3d2809c7cfbed031f39813ba` (test), `f1bacd732ccee206cdcccc9f454e56aa33a87b4b` (CI gate).
- Build/Security CI `45145599809`: **SUCCESS**, explicitly including `Encrypted P5.9 backup and restore regression`, Type Check and Production Build (no deploy).
- Isolated PostgreSQL HTTP/Chromium CI `45145599779`: see the run's latest conclusion; all application-level HTTP, two-context sync, receipt PDF and offline PWA job steps passed at time of report creation. This workflow has no Production DB access.
- https://github.com/santilab48/StayHub/actions/runs/45145599809
- https://github.com/santilab48/StayHub/actions/runs/45145599779

## Backup and rollback outstanding gates

**Not yet verified:**
- A scheduled and retained **Production PostgreSQL backup** with tested restore into a separate disposable environment; the Railway connector inventory exposed a persistent volume, not a verified backup policy or recovery point.
- Actual Production rollback and database compatibility drill; `canRollback` and a previous SHA are *references*, not an executed exercise.
- Real browser profile deletion or disk failure recovery without an independently saved encrypted backup file.
- Current Production Secret values (redacted), direct independent live DB SQL review, physical-device Print/PWA.

Before claiming full disaster recovery, establish off-site encrypted PostgreSQL backup with documented schedule, retention and alerting; restore a copy into an isolated non-production database; validate migration checksums/counts and critical business invariants; and rehearse app rollback in isolated staging. Do not destroy or fork Production as an implicit backup.

## Safety and change status

No Production deploy, migration, server mutation, user-data write, rollback, app UI/UX change, Railway config change, or Draft PR #2 merge was performed. All new test records were created only in isolated fake IndexedDB (or earlier disposable CI PostgreSQL).

**Next P5.10:** overall release-readiness decision must explicitly carry the open Production backup/restore proof, Platform Super Admin disabled, and unperformed Production Write E2E rather than marking all scope green.
