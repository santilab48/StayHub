# P2.8-E2 — Production write-freeze preparation and verified source restore evidence

Date: 2026-11-22 (Asia/Bangkok).
Branch: `feat/stayhub-p26-readiness`.
**Decision: NO-GO — do not deploy or switch Production yet.**

## Live Railway Production backup/restore evidence supplied by the operator

After E1 was committed, the operator connected from Windows via Railway CLI authenticated SSH tunnel to Production `Postgres-PDqf` (database `railway`, user `postgres`). Session-only `default_transaction_read_only=on` was confirmed for inventory. This does **not** freeze writes by other active application sessions.

Exact SQL counts returned six primary business tables at zero, and the sum of `COUNT(*)` for the 13 remaining business tables was zero. This proves all 19 business tables were empty **at that observation**, not indefinitely.

The operator then created a real dump from the Railway source using PostgreSQL 18 `pg_dump -Fc` via CLI SSH tunnel, not a CI fixture:

| Evidence | Reported value |
|---|---|
| Dump basename | `stayhub-railway-production-20261122-213319.dump` |
| Dump size | 81,325 bytes |
| `pg_dump` exit | 0 |
| `pg_restore --list` exit | 0 |
| Archive list lines | 190 |
| SHA-256 | `4C4AA32AD146903FA8FA1E7D2CC08FA0D9FB55E3D8AE62843B76FB02471658DB` |
| Isolated restore | Docker `postgres:18`, container `stayhub-restore-test`, host loopback port 55432, database `stayhub_restore` |
| `pg_restore` exit | 0 |
| Restored schema | 20 tables, 11 migrations, 19 business tables 0 rows |
| Restored catalogs | 277 constraints, 64 indexes, 10 noninternal triggers |
| Migration SHA-256 | 11/11 filename/checksum pairs matched the P2.8-B audited repository migrations |

The operator supplied the command output in the conversation. The agent **did not independently possess or inspect the dump bytes**, independently query the actual Railway source, or conduct a byte-for-byte source-vs-restore catalog fingerprint diff. Treat this as operator-observed successful real backup and restore, with that verification limitation. The dump file remains on the operator's Windows computer; it was **not uploaded to GitHub**. Protect its access and preserve a tested local/offsite copy according to the operator's retention policy. Do not expose its contents.

## Write-freeze implementation prepared, disabled by default

- `middleware.ts`: when `STAYHUB_WRITE_FREEZE=YES`, all `/api/*` requests return 503 except `/api/health/db`, `/api/health/db/transport`, and `/api/health/db/freeze`; also blocks non-GET/HEAD/OPTIONS page requests. The existing app is unchanged when the flag is absent. Blocking API GET is deliberate because sessions/throttling can write.
- `lib/db/postgres.ts`: when frozen, application PostgreSQL sessions start with `default_transaction_read_only=on` (defense in depth against accidental writes outside middleware); Neon Production connections additionally refuse to initialize unless the write-freeze flag is enabled.
- `/api/health/db/freeze`: when frozen, probes an actual app connection's `default_transaction_read_only` and returns `{status:'frozen',readOnly:true}` only if enabled; no credentials or DB host exposed. Otherwise 503; guarded to project/environment.
- `scripts/test-p28e2-write-freeze.mjs` and `.github/workflows/p28e2-freeze-guard.yml`: static configuration contracts, TypeScript and build checks.

**Important limitation:** This is **an application-layer freeze**, not a guaranteed database-wide freeze. Existing connections, prior app versions during rolling deploy, other database users, direct SQL, and potentially uncaught server code can still write. SQL privileges remain unchanged. The source database must have an independently confirmed write-blocking and verified drain strategy before a zero-row cutover. Do not mistake setting a read-only flag in an interactive `psql` session for a global write freeze.

## Remaining release gates

1. Verify CI build/typecheck and test staging behavior with freeze **explicitly enabled on an isolated test deployment**. Confirm API writes return 503, freeze probe returns 200/readOnly true, DB direct write through the app is denied, then disable flag and verify normal staging behavior. Do not enable the flag on live Production without an approved maintenance plan.
2. Devise and **prove** an ingress/traffic write freeze, including old versions/in-flight requests and any other DB writers. Recount Railway Production's 19 tables under the actual freeze, with a time-stamped audit.
3. Validate storage and retrieval of the **original Railway `DATABASE_URL`** as a secret, with recovery test that does not disclose the URL. The available connector cannot inspect secret values.
4. Preserve the Railway Postgres volume and a recoverable actual-source backup (operator report above); for strict parity, run and archive matching source-and-restore `p28e1-readonly-fingerprint.sql` results under the freeze.
5. Perform a separate **explicitly authorized** Production code promotion **before** URL switch; Production currently runs the older branch. Confirm middleware/DB guards deployed and migration hook works with the old Railway source.
6. Authorize the Neon Production switch separately and validate `/api/health/db` and transport TLS/certificate checks before enabling writes. Never claim Production→Neon TLS has been proven prior to actually testing that route in an approved deployment.
7. Rollback before any Neon write: keep freeze active, securely restore original provider/URL as a controlled deployment and verify old database. **After any Neon write**, do not blindly repoint: freeze both sides, back up, reconcile and rehearse data recovery first.

**No Production deployment, variable switch, write, schema change, database deletion, or merge authorized/performed in P2.8-E2.** Pushing this branch may auto-deploy **Staging**; ensure its freeze flag remains unset.
