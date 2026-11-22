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

## P2.3 — Reservation and monthly lease backend (2026-11-22)

The backend is still on Railway Postgres Staging; **no Neon cutover** and no UI redesign.

- `/api/v2/reservations` GET/POST: owner/admin-only property-scoped reservations; create with valid arrival/departure dates, maximum 365 nights, explicit `Idempotency-Key`, pessimistic unit row lock and database exclusion constraint for overlapping confirmed reservations; cancel before check-in. The same key + same payload returns the previous booking, including concurrent requests after the unit lock.
- A reservation cannot be created for an inactive, currently occupied, or blocked room; the existing conservative rule prevents future bookings for rooms with indefinite current stays. No guest account or billing credentials are accepted from caller.
- `db/migrations/007_monthly_leases.sql`: an active agreement ties `property_id,stay_id,account_id,unit_id` through a composite foreign key to a verified Stay. One active lease per stay. Records monthly rent/deposit and effective dates but is **not** a signed legal contract or invoice.
- `/api/v2/leases`: owner/admin-only list, create lease for active authorized Stay, and terminate lease. The API derives tenant identity and unit from Stay, not user-provided IDs.
- Checkout and room transfer now reject active leases until the owner explicitly terminates the lease, preventing an accidental reassignment while a lease remains active.
- CI static contract and transaction-only PostgreSQL tests extend property isolation to leases and booking conflicts.
- Railway Staging deployment with guarded migration 007 completed SUCCESS; separate staging deployment including `db:staging:check` and `test:id-binding:db` completed SUCCESS. Logs shown through the connector did **not** include granular individual assertion output, so this is not a claim of fully verified HTTP end-to-end behavior.
- Temporary pre-deploy commands were removed after those deployments. The Production service remains untouched.

**P2.3 limitations:** manual reservation entry only; online tenant check-in, linking reservation to Stay, automatic checkout/reservation status reconciliation, monthly rent invoice generation, payment collection and signed documents are not yet built. Do not load real guests or money into Staging.

## P2.4 — reservation-linked QR check-in and check-out (2026-11-22)

- `db/migrations/008_reservation_stay_binding.sql` adds an optional `reservation_id` on `stays`, a unique reservation-to-stay mapping, and database composite FKs ensuring the property, unit and guest Account ID agree with the reservation.
- `POST /api/v2/reservations` supports `action=check-in`, requiring an authenticated owner/admin and a property-scoped **pending QR join request**; the account comes from the join request rather than the caller. Check-in locks the unit and reservation, checks the Bangkok-local booking date range, room capacity/blocks/housekeeping, updates the reservation guest ID and status, creates the linked stay, and approves access in a single transaction.
- `action=check-out` locks the unit/reservation and ends the linked stay with the existing housekeeping logic, revokes access when appropriate, and sets reservation status to checked_out in one transaction. An active monthly lease blocks checkout until terminated.
- Generic checkout and transfer endpoints now refuse reservation-linked stays to prevent diverging reservation and access states.
- CI static contract tests and transaction-only PostgreSQL test cases add account impersonation, cross-property FK and duplicate-reservation stay assertions. No permanent test tenants or bookings should survive the rollback.
- The feature is still staging-only. **Not yet integrated:** repeated visits of the same guest require a redesigned QR join request uniqueness rule, early/late checkout policies, deposit/billing reconciliation, guest identity confirmation, documented race testing, direct HTTP cross-user tests and signed hotel registration forms. Do not treat it as a finished public hotel check-in system.
- No Neon migration, UI redesign, PR merge or Production deployment.

### P2.4 repeat-guest finishing work

- Migration `009_repeat_guest_join_requests.sql` removes the old property/account lifetime uniqueness constraint on join requests, retaining a partial unique index that permits **one pending request at a time** for each property/account while preserving prior approved/rejected history.
- QR join creation now considers only pending requests duplicates and rejects accounts with a current active stay. Guests who have checked out can scan a fresh QR and request the next stay with the same Account ID.
- Regression tests add repeat-visit and duplicate-pending checks under a rollback-only PostgreSQL transaction.
- Staging deploy with one-time guarded migration 009 reported SUCCESS (`3f1faf58-a7fb-4d16-9a8e-32a0ec748c28`); a staging deploy with `db:staging:check && test:id-binding:db` also reported SUCCESS (`2848b726-2c01-4bc6-afb7-6da3dfc471ce`). Individual SQL assertion output was not exposed by the connector, so independent case-level verification remains open.
- Both one-time Railway pre-deploy hooks have been cleared; do not attach them permanently.
