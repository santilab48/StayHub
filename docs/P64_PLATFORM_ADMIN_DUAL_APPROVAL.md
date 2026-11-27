# P6.4 — Dual-signed Platform Admin provisioning and immutable Neon audit

Date: 2026-11-23 (Asia/Bangkok)
Repository: `santilab48/StayHub`, branch `feat/stayhub-p26-readiness`.

## Scope and decisions

The user requested continuation of the Final Cutover work. This iteration implements a **separate, offline-only**, strongly guarded operator workflow to grant or revoke Platform Super Admin. It does NOT install a privileged web endpoint, does NOT make an ordinary property Owner a Platform Super Admin and does NOT assign any real user privileges. The existing read-only `/platform-admin` directory remains server protected.

## Implemented

- `neon/membership/003_platform_admin_audit.sql`: additive Neon-only `platform_admin_events` schema with unique `request_id`, approver key fingerprints, account UUID, operation and reason. Trigger rejects UPDATE and DELETE on the event ledger. No seeded rights.
- `scripts/p64-platform-admin-provision.mjs`: offline command reading a signed JSON request. Requires **two distinct Ed25519 public keys**, two valid signatures of the *identical canonical request*, action `grant`/`revoke`, Railway UUID, one-time request ID, reason and expiration no more than 15 minutes in the future. The CLI independently verifies the account UUID in Railway `stayhub.accounts`, locks on the target UUID, refuses replay, and writes both Neon admin status and the audit event in a **single transaction**.
- No network-exposed mutating API, no public key or password embedded in source; each public key is configured by the operator outside the frontend.
- Staging command is gated behind explicit `STAYHUB_P64_STAGING_APPROVED=YES`, pinned Railway project and staging environment identity, matching Neon hostname and database, and a dedicated `stayhub_identity_reader` Railway DB role. This role must be independently provisioned to read only Railway account IDs; without it the operation refuses. Neon admin-writing credentials are isolated from the Railway application service. Production privilege mutations are **hard-disabled** by the P6.4 CLI.
- `scripts/p64-platform-admin-provision-e2e.mjs`: uses only two disposable localhost PostgreSQL databases, generates ephemeral Ed25519 key pairs, tests no unknown Railway identity, no forged signature, no duplicate approver public key, successful grant, prevention of replay, successful revocation, replay refusal and immutable audit trigger.
- GitHub Actions isolated workflow migrated `003_platform_admin_audit.sql` in the independent Neon stand-in and includes the new test.

## Neon staging verified

- Neon project `late-darkness-78944075`, branch `br-fancy-sky-a1n96vul`, database `neondb`.
- Verified `platform_admin_events` absent before applying migration, applied **five additive statements** transactionally with no DROP/DELETE/UPDATE data operations, and verified the read-only `stayhub_membership_reader` can SELECT from the table.
- **0 audit events** exist on Staging after migration. The `platform_admin_events_immutable` trigger exists for UPDATE and DELETE.
- This work did not alter Neon Production `br-snowy-tree-a1kt7omx`, the Railway Production PostgreSQL, or any real account rights.

## Tests

- GitHub Actions Build/Security: https://github.com/santilab48/StayHub/actions/runs/45163671715
- GitHub Actions isolated PostgreSQL / signed admin workflow / Chromium / backups: https://github.com/santilab48/StayHub/actions/runs/45163671719
- The two CI URLs above should be inspected for a final `conclusion: success` before describing all P6.4 regression as passing.
- Earlier targeted test output confirmed the step `Test dual-signed operator grant and revoke with immutable audit` passed.

## Remaining release gates

1. Approve two real human security approvers and independently store/protect their Ed25519 signing private keys; use the separated public keys only when authorized. **Code cannot establish the human identity behind an unspecified key.**
2. Provision an independently reviewed `SELECT`-only `stayhub_identity_reader` Railway role for the Staging identity preflight. Do not reuse the app DB writer role or expose this role publicly.
3. Exercise a documented, fully authorized staging grant/revoke acceptance, then review security and create Production schema/roles only after a separately validated Production backup/restore point. No automatic production role bootstrap.
4. Actual Railway Production backup/restore proof, approved Production room-sync write E2E, commercial membership catalog/prices/renewals, and physical mobile/PDF/rollback verification remain open.

**No production deployment or migration in P6.4.** Infrastructure cutover remains operational on the prior, passing Production deployment. Super Admin mutation UI remains disabled, and FINAL CUTOVER 100% is NOT claimed.
