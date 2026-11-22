# StayHub — Unified accommodation architecture

Status: **Approved product direction, partial onboarding implementation, booking and payment modules not yet built.**
Date: 2026-11-22

## Scope and deployment
One GitHub repository `santilab48/StayHub`, one Next.js application and one deployment/domain. There must not be separate projects, databases or backends for apartment, daily lodging, guesthouse or homestay. Keep existing Supabase connection during migration; do not relocate production data or change deployment provider as part of this decision. LINE OA/LIFF is not required.

## Accommodation types
- `apartment`: dormitory/apartment (monthly rent, tenancy contracts, utilities).
- `guesthouse`: guesthouse (reservations, per-night pricing, arrival/departure).
- `daily`: daily rental (short stays, room availability, deposits).
- `homestay`: homestay (individual rooms or entire-property units, guest counts, optional add-ons).
- All are just configuration for a **single property module**. The same property can eventually allow `monthly`, `nightly` or `mixed` billing without changing codebases.
- Type-specific screens are feature flags or filtered navigation, not separate deployments.

## Canonical server data model (PROPOSED; not yet migrated)
- `properties`: id, account_id, name, type, timezone, currency, billing_mode, created_at.
- `units`: id, property_id, name, unit_kind (room/entire_property/bed), max_occupants, active.
- `rate_plans`: id, property_id, unit_id, period (night/month), price, taxes/fees rules, effective dates.
- `reservations`: id, property_id, unit_id, guest_id, arrival_date, departure_date (exclusive), status, rate_snapshot, channel, idempotency_key.
- `stays`: id, reservation_id nullable, property_id, unit_id, check_in_at, check_out_at, status.
- `leases`: id, property_id, unit_id, resident_id, starts_on, ends_on, security_deposit, status.
- `charges`, `invoices`, `payments`, `receipts`: authoritative ledger, unique payment refs and immutable audit history.
- `maintenance_requests`, `announcements`, `inbox_notifications`, `push_subscriptions`: shared communication.
- `membership`: account/role permissions and property-specific grants.

**Migration rule:** Keep legacy `tenants`, `rooms`, `bills` and `occupancies` untouched until an additive staging migration, backfill and compatibility-layer tests succeed. No production DDL is authorized. Keep tenant_id/property_id constraints on foreign keys to prevent cross-property linkages.

## Booking correctness
- Only server-confirmed bookings block inventory; offline drafts do not.
- Reject overlapping active reservations or occupied stays for the same unit and dates, transactionally in PostgreSQL (consider `daterange` exclusion constraint in a reviewed migration).
- Arrival date inclusive, departure date exclusive, dates interpreted in property timezone. Bookings by night do not rely on browser UTC offsets.
- Distinguish booked, checked-in, checked-out, cancelled, no-show; refunded payment is separate from a cancelled reservation.
- Prices, cancellation rules, deposits and taxes must be snapshotted at confirmation, not recalculated from today's rates.
- Handle partial payments and double-submit idempotency. Never send receipts until payment is verified.
- Support property-level rules about entire-property booking versus room-by-room bookings; no double-selling same physical inventory.

## Access and privacy
- Owners/staff see only authorized properties. Guests see only their own reservation, receipts and messages.
- Server authorization and PostgreSQL RLS are mandatory for shared records; IndexedDB is only a draft/cache, not authority for paid, reserved or checked-in status.
- Avoid retaining guest identity documents in unencrypted local storage. Provide retention and deletion policy compliant with applicable requirements.
- Check legal obligations such as guest registration, lodging classification, taxes and receipts separately for the operating location before implementing compliance claims.

## UX
- Registration: choose property type → local workspace → verified web account (future) → property claim (future).
- Owner navigation uses one shell; monthly and nightly modules appear according to property settings.
- Guest/resident PWA home: six simple buttons (my stay/room, bills/payments, request assistance, packages/services, notices, contact), plus notifications; for short stays, booking/arrival information is visible inside my stay.
- Push requires opt-in permission and a server-backed notifications inbox. No LINE OA required.

## End-to-end release gates
1. Additive staging schema + migration inventory and tests.
2. Secure web account registration and ownership claim.
3. Unit inventory and rate plans; nightly booking calendar and non-overlap concurrency tests.
4. Checkout/arrival/stay state machine, refundable deposits and receipts.
5. Monthly rental and utilities regression tests on legacy data.
6. Resident/guest authorization, property A/B isolation, notification delivery and offline behavior.
7. PWA installability, backup/recovery and one-project deployment smoke test.
8. Explicit production deployment approval. Do not add a separate service/project.
