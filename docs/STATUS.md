# StayHub Core Status

Updated: 2026-08-26

## Architecture locked

- Platform Owner: `/platform/*`
- Tenant/OA admin: `/t/[tenantSlug]/admin/*`
- Resident app: `/t/[tenantSlug]/app/*`
- One codebase, one Supabase project, many OA tenants.
- Every operational record is tenant-scoped.
- Resident rows are further isolated to the resident's own room/profile/lease where applicable.
- Private Storage objects must use `tenant_id/...` as the first folder segment.

## Database core completed

Core entities:
- tenants, tenant_entry_directory, tenant_subscriptions, tenant_access_events
- profiles, buildings, rooms, leases
- contract_signatures, contract_audit_logs
- meter_readings
- invoices, invoice_items, payments, payment_receipts
- maintenance_tickets, maintenance_events, ticket_images
- parcels
- drivers, ride_requests, vehicles
- announcements
- tenant_settings
- notification_queue
- platform_admins
- route_audit_logs

## Transaction/RPC core completed

- `resolve_tenant_entry(slug)` — minimal public OA/tenant resolver.
- `subscription_can_access(tenant_id)` — subscription gate.
- `mark_tenant_billing_status(...)` — Platform Owner rental lock/resume flow.
- `record_meter_reading(...)` — human-confirmed meter write.
- `generate_room_invoice(...)` — idempotent monthly room invoice generation.
- `approve_payment(...)` / `reject_payment(...)` — payment review + receipt/status transaction.
- `transition_maintenance_ticket(...)` — maintenance timeline + notification queue.
- `pickup_parcel(...)` — resident/staff parcel pickup guard.
- `queue_notification(...)` — future LINE delivery queue.

## Security completed

- Supabase RLS enabled across tenant data.
- OA A cannot read/write OA B.
- Resident A cannot read Resident B's room, invoice, contract, parcel, maintenance, vehicle, ride or receipt records.
- Admin/staff access is limited to their own tenant.
- Platform rental controls are separate from tenant admin controls.
- Storage access is tenant-folder scoped.
- Supabase Security Advisor: no current security lint warnings after latest security migrations.

## UI routes completed

Resident:
- home
- my room
- paperless contract
- billing/payment
- repairs
- services (parcel / local ride / Grab handoff)
- news

Tenant admin:
- dashboard
- rooms
- residents
- contracts
- finance
- meter OCR walk mode
- repairs
- parcels
- rides/drivers
- announcements
- reports
- settings

Platform:
- dashboard
- OA/tenant management
- rental billing
- reports
- settings

## Vercel

Production project: `stayhub`
Production alias: `stayhub-shop-kuen.vercel.app`
Latest canonical deployment built successfully on Next.js 15.5.x and reached READY.
Deployment Protection is currently enabled on Vercel.

## Intentionally deferred until final integration

LINE OA / LINE Developers / LIFF identity is intentionally deferred per project decision.

When LINE is connected, the identity adapter must:
1. Verify LINE identity server-side.
2. Resolve LINE OA / tenant slug -> tenant_id.
3. Resolve line_user_id -> profile.
4. Bind the authenticated session to `auth_user_id` / tenant profile.
5. Apply role guard (`tenant`, `staff`, `admin`, `owner`).
6. Redirect suspended tenants to `/t/[tenantSlug]/blocked`.
7. Process `notification_queue` through the correct OA access token only.

Do not add anonymous writes to bypass this step. That would weaken tenant isolation.

## Next build tasks after LINE identity is available

- Wire resident forms/actions to Supabase session.
- Wire admin create/update forms to existing RPCs/tables.
- Build signature-pad upload + signed PDF renderer.
- Connect meter image OCR provider to `detected_value`; always require human confirmation.
- Connect LINE Messaging API worker to `notification_queue`.
- Configure each OA Rich Menu to its own `/t/<slug>/...` routes.
