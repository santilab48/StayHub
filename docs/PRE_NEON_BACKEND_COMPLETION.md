# StayHub — Finish Backend on Railway before considering Neon

Date: 2026-11-22. Decision: do NOT initiate any Neon migration now. Existing Railway PostgreSQL remains the authoritative staging database. New frontend UI work is deferred.

## Architecture invariants

- One GitHub repository: `santilab48/StayHub`, one Next.js app/API service and one PostgreSQL service in the same Railway project/environment.
- Staging database never shares credentials with Production.
- Every resident has `account_id`; each property `property_id`, room `unit_id`, approved occupancy `stay_id`.
- Owner-created QR stores `created_by` + `property_id` on server; scanning QR only creates pending requests. Membership and room access require owner approval.
- No access from one property to another or from one resident to another's room/bills.
- PWA is an installable interface, never the source of record for shared resident data.

## Implementation status

### Implemented in server code
- Owner accounts/login/session, property creation, units, QR invite creation/list/revocation.
- Tenant scan/join request; owner approve/reject; tenant room panel shows account-scoped active stays and request status.
- Property-scoped occupancy and resident-history endpoints `GET /api/v2/occupancy?propertyId=`, `GET /api/v2/residents?propertyId=`.
- Owner checkout `POST /api/v2/checkout`, transfer `POST /api/v2/transfer`, mark cleaning ready `POST /api/v2/room-ready`, maintenance block/unblock and list.
- Serialized unit locking when assigning rooms; prevents assigning a room that is full, blocked, cleaning or reserved today.
- Checkout ends active stay and current resident membership when no other active stay exists, and schedules housekeeping when last occupant leaves.
- Room transfer closes the old stay and starts a new one atomically; maintains historical stay IDs and schedules cleaning for vacated room.
- Audit events for approvals, checkout and transfer in schema 006.
- Database-backed per-email signup/login attempt throttling; **not sufficient for public launch** without IP/edge protections and account verification.

### DB schema
- 001 core, 002 overlap guard, 003 QR binding, 004 attempt throttle, 005 stay-account match are in Staging.
- 006 room lifecycle: `unit_blocks`, `housekeeping_tasks`, `stay_events` and property-scoped composite foreign keys. Guarded one-time migration command and the read-only migration check + transaction-only ID binding tests were run via Railway staging deployment hooks, with each deployment marked SUCCESS. The Railway connector did not expose all command-level output, so schema ledger and case-by-case assertion evidence still need independent confirmation.

### Not done; keep blocked before serving real residents
- Independent cross-account HTTP E2E tests including owner A vs B, tenant A vs B, expired/revoked QR, transfer/checkout and housekeeping.
- Collection of case-level PostgreSQL integration-test logs and explicit migration ledger version check; Railway deployment SUCCESS alone is not sufficient proof.
- Verified email and secure password recovery, edge/IP rate limiting and abuse protection.
- Real booking/lease/billing/repair/parcel/notification flows in Postgres. Legacy Supabase routes still exist and **must not be treated as migrated**.
- Actual iOS/Android PWA behavior and Web Push.
- Financial permissions, signed-document permissions, backups, data retention and audit review.
- No Neon work or Production merge/deploy until authorized after these gates.

## Notes for future UI phase

Only after backend contracts settle, design mobile-first owner dashboard (properties, rooms, occupancy, invite QR, pending requests, checkout, transfer, cleaning) and tenant six-tile PWA. Do not ask users to type raw IDs.

## Operational restrictions

No `main` merge. No Railway Production change. Run reviewed migrations against dedicated Staging only, never as a persistent preDeploy hook.

## Latest Staging verification

- Commit `52debc9d8a0a931b23e4925f7260fe0ff6ce87a1` GitHub workflow completed **success** (build, TypeScript, security/structure checks).
- Railway Staging deployment `76f36e6c-b5c9-4ea3-9277-75e92b28fae3` reported **SUCCESS** after the guarded `db:staging:check && test:id-binding:db` pre-deploy command was attached for that deployment.
- Prior Staging deployment `b2eacee7-c09b-4713-bffc-3494dda9b111` reported **SUCCESS** with guarded migration command.
- Both temporary deployment commands were removed afterward; current `preDeployCommand` is `[]`.
- This is not an independently observed HTTP E2E run or raw database schema inspection. Keep public real-user onboarding restricted until those are verified.
