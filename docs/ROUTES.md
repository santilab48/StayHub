# StayHub Route Map

## 1) Public / Entry
- `/` — Rich Menu preview / entry resolver
- `/t/[tenantSlug]` — tenant entry; resolves OA/tenant and checks subscription
- `/t/[tenantSlug]/blocked` — subscription suspended/expired screen
- `/auth/line/callback` — reserved for LINE Login/LIFF callback (connect last)

## 2) Tenant App (resident)
All resident routes live under `/t/[tenantSlug]/app` and MUST resolve tenant before querying data.

- `/t/[tenantSlug]/app` — resident home
- `/t/[tenantSlug]/app/room` — room profile
- `/t/[tenantSlug]/app/room/contract` — active paperless contract
- `/t/[tenantSlug]/app/room/contract/[leaseId]` — contract detail/version
- `/t/[tenantSlug]/app/billing` — invoices & payment status
- `/t/[tenantSlug]/app/billing/[invoiceId]` — invoice detail
- `/t/[tenantSlug]/app/billing/[invoiceId]/pay` — slip upload / payment submission
- `/t/[tenantSlug]/app/repair` — repairs list
- `/t/[tenantSlug]/app/repair/new` — submit repair
- `/t/[tenantSlug]/app/repair/[ticketId]` — repair status
- `/t/[tenantSlug]/app/services` — services hub
- `/t/[tenantSlug]/app/services/parcels` — parcels
- `/t/[tenantSlug]/app/services/rides` — local rides + Grab outbound
- `/t/[tenantSlug]/app/services/rides/new` — request/schedule ride
- `/t/[tenantSlug]/app/news` — announcements
- `/t/[tenantSlug]/app/news/[announcementId]` — announcement detail

## 3) OA / Dorm Admin
All dorm-admin routes live under `/t/[tenantSlug]/admin`.

- `/t/[tenantSlug]/admin` — dashboard
- `/t/[tenantSlug]/admin/rooms` — rooms
- `/t/[tenantSlug]/admin/rooms/[roomId]` — room detail
- `/t/[tenantSlug]/admin/residents` — residents
- `/t/[tenantSlug]/admin/residents/[profileId]` — resident detail
- `/t/[tenantSlug]/admin/contracts` — contracts
- `/t/[tenantSlug]/admin/contracts/new` — generate contract
- `/t/[tenantSlug]/admin/contracts/[leaseId]` — contract/sign/audit
- `/t/[tenantSlug]/admin/billing` — invoices
- `/t/[tenantSlug]/admin/billing/meter-walk` — walking meter mode
- `/t/[tenantSlug]/admin/billing/meters/[roomId]` — capture + OCR + human confirm
- `/t/[tenantSlug]/admin/billing/payments` — payment review
- `/t/[tenantSlug]/admin/repairs` — repair queue
- `/t/[tenantSlug]/admin/parcels` — parcel management
- `/t/[tenantSlug]/admin/rides` — driver/request management
- `/t/[tenantSlug]/admin/announcements` — announcements
- `/t/[tenantSlug]/admin/reports` — exports/reports
- `/t/[tenantSlug]/admin/settings` — tenant-specific settings

## 4) Platform Owner (StayHub SaaS)
Never place tenant operational records directly in platform routes except aggregate/support views.

- `/platform` — platform dashboard
- `/platform/tenants` — all OA tenants
- `/platform/tenants/new` — onboard OA tenant
- `/platform/tenants/[tenantId]` — OA tenant detail
- `/platform/tenants/[tenantId]/subscription` — rental status, due date, suspend/resume
- `/platform/tenants/[tenantId]/access` — access history
- `/platform/billing` — SaaS rental payments
- `/platform/reports` — platform aggregate reports
- `/platform/settings` — platform owner settings

## 5) API Boundary
Route handlers should be tenant-scoped. Client-supplied `tenant_id` is never trusted by itself.

Resident APIs:
- `/api/t/[tenantSlug]/me`
- `/api/t/[tenantSlug]/room`
- `/api/t/[tenantSlug]/contracts/*`
- `/api/t/[tenantSlug]/invoices/*`
- `/api/t/[tenantSlug]/payments/*`
- `/api/t/[tenantSlug]/repairs/*`
- `/api/t/[tenantSlug]/parcels/*`
- `/api/t/[tenantSlug]/rides/*`
- `/api/t/[tenantSlug]/announcements/*`

Admin APIs:
- `/api/t/[tenantSlug]/admin/rooms/*`
- `/api/t/[tenantSlug]/admin/residents/*`
- `/api/t/[tenantSlug]/admin/contracts/*`
- `/api/t/[tenantSlug]/admin/meters/*`
- `/api/t/[tenantSlug]/admin/payments/*`
- `/api/t/[tenantSlug]/admin/repairs/*`
- `/api/t/[tenantSlug]/admin/parcels/*`
- `/api/t/[tenantSlug]/admin/rides/*`
- `/api/t/[tenantSlug]/admin/announcements/*`

Platform APIs:
- `/api/platform/tenants/*`
- `/api/platform/subscriptions/*`
- `/api/platform/reports/*`

## 6) Guard Order
For every `/t/[tenantSlug]/**` request:
1. Resolve `tenantSlug -> tenant.id`.
2. Verify tenant exists and tenant status is active.
3. Read tenant subscription.
4. If suspended/cancelled/expired beyond grace, redirect to `/t/[tenantSlug]/blocked`.
5. Verify user identity/session.
6. Resolve user profile by session identity.
7. Confirm `profile.tenant_id == tenant.id`.
8. For `/admin`, require role `staff|admin|owner`.
9. Execute DB query under RLS.

## 7) Non-collision rules
- Every operational table has `tenant_id`.
- Every storage object path starts with `<tenantId>/...`.
- Every route that refers to a record checks tenant ownership.
- Never accept record ID alone as authorization.
- Never share browser/session Supabase client instances across server requests.
- Platform owner identity is separate from tenant admin identity.
- Suspending one tenant does not modify or delete its data.

## 8) Storage paths
- Contracts: `stayhub-contracts/<tenantId>/<leaseId>/...`
- Payments: `stayhub-payments/<tenantId>/<invoiceId>/...`
- Meters: `stayhub-meters/<tenantId>/<roomId>/<yyyy-mm>/...`
- Repairs: `stayhub-maintenance/<tenantId>/<ticketId>/...`
- Parcels: `stayhub-parcels/<tenantId>/<parcelId>/...`

## 9) LINE OA mapping (connect last)
One LINE OA maps to exactly one StayHub tenant by `tenants.line_oa_id` and `tenants.app_slug`.
Rich Menu URLs will point to `/t/<tenantSlug>/app/...` and admin Rich Menu to `/t/<tenantSlug>/admin/...`.
