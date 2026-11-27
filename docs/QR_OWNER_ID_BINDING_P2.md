# StayHub P2 — QR owner/property ID binding handoff
Updated: 2026-11-22. Feature branch only; staging deployment, **not Production**.

## Locked product decisions

- One GitHub repository and one Railway Next.js frontend/API service per environment, plus Railway PostgreSQL.
- Owner registers, creates property/units, generates a short-lived QR from the owner dashboard.
- QR is a random, non-recoverable link token. The server stores its SHA-256 hash in `stayhub.invites` together with `property_id`, `created_by` and optional `unit_id`.
- Tenant scans QR, registers/logs in, submits a pending request. Only a verified property owner/admin can approve a unit.
- Approval creates the exact binding `account_id + property_id + unit_id + stay_id`.
- The six-tile tenant PWA panel reads only the authenticated account's active stays; QR alone never opens bills, documents or another room.
- Owners with multiple properties get separate QR sets, requests and units. No LINE OA is needed.

## Routes

- `/cloud`: staging owner account, accommodation, room and QR dashboard
- `/join?token=...`: guest invitation preview and join request
- `/my`: resident six-button panel, personal request status and PWA installation helper
- `/api/v2/[action]`: server-only auth/property-invite-resident endpoints
- `/api/health`: process liveness

## Database migrations applied through guarded Staging pre-deploy

1. `001_stayhub_core.sql`: accounts/properties/memberships/units/reservations/notifications.
2. `002_reservation_conflict_guard.sql`: excludes same-unit overlapping active reservations.
3. `003_identity_invitation_binding.sql`: sessions, invites, join_requests, stays, property-scoped foreign keys.
4. `004_auth_throttling.sql`: DB-backed attempt counters for per-email login and signup, without storing plaintext email.
5. `005_stay_account_request_guard.sql`: enforces stay's account ID matches the approved join request's account ID when referenced.

**Migration and integration test commands are NOT persistent deploy hooks.** The latest Staging deployments with those temporary commands reported SUCCESS; the connector's displayed logs lack some per-command output, so exact applied-version verification and individual DB test case output should be collected separately before production release.

## Owner QR lifecycle

- Generate a QR with 7-day expiration, up to 100 join requests; at most 20 outstanding invitations per property.
- Owner/admin can list invite metadata or revoke a QR, but cannot recover its original raw token.
- Owner/admin can approve a pending request to an existing unit or reject it.
- A revoked/expired QR cannot issue new requests. Old pending requests require separate review.
- QR generated for one property never gives membership of another property. All owner API calls check `property_id` against the authenticated membership.

## Safeguards

- Secure, HttpOnly, SameSite=Lax sessions (14-day token with SHA-256 hash stored server-side).
- Server-generated IDs, UUID validation, property-scoped SQL, hashed invitation tokens, row-lock before creating a join request.
- PostgreSQL composite foreign keys for property, unit, request and account linkage.
- Scrypt password hashes, per-email database-backed attempts: login 8 per 15 minutes, registration 3 per hour; **this is not full anti-abuse protection**.
- Logout revokes session server-side.
- Service worker caches only public icon and manifest, never tenant pages or private API data.
- The full code path is gated to the known Staging environment and `STAYHUB_ENABLE_TEST_SIGNUP=1`.

## Open security / functionality work (before real users)

- Verify account emails, implement secure reset/recovery, edge/IP rate limits and bot defenses.
- End-to-end HTTP tests with isolated user sessions across two properties; capture case-by-case PostgreSQL assertion logs.
- Add audit trail for QR creation, revocation, approval and rejection.
- Define explicit residence checkout/expiration flows and occupancy/capacity policies.
- Complete Supabase legacy feature migration, correct per-account billing/access rules and document/image authorization.
- Test actual install on iOS Safari and Android Chrome; add notification subscriptions and Web Push only after user consent.
- No confirmed external HTTP probe from current connected tools. Railway reports Next.js + Postgres online; this is not sufficient to certify end-to-end user functionality.
- Do not use real personal information, real receipts, or production payment details in Staging.

## Deployment invariants

Repository `santilab48/StayHub`; branch `feat/stayhub-p1-security-staging-audit`; Railway project `radiant-manifestation`; environment `staging` (`ced39691-4fe7-4707-bba7-6d0e801f1ff8`). Staging URL: `https://stayhub-fsd-staging.up.railway.app`.

Production is unchanged: its GitHub-linked StayHub service still has unapplied staged changes; no Production deployment or database migrations, and no PR merge.
