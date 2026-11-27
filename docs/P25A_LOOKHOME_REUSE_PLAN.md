# StayHub P2.5-A — LookHome billing reuse plan

Date: 2026-11-22. Analysis only. Source: supplied `lookhome-main(1).zip`; StayHub branch `feat/stayhub-p1-security-staging-audit` at `b08b388ebde35330f49eaf41b2d57a100852811e` (local and remote equal; clean checkout). No migration executed, runtime code or UI changed, deployment, Neon cutover, or merge.

## Source review and decisions

| LookHome source | Existing behavior | Decision for StayHub |
| --- | --- | --- |
| `server/routes/bills.js`, `schema.sql` | Monthly invoice with rent, optional garbage charge, water/electric items; single transaction inserts bill and items; skips existing contract/period | Reuse item snapshot, totals, period and duplicate prevention as concepts. Implement on current lease/stay IDs with database uniqueness and locked generation. |
| `server/routes/meterings.js`, `bills.js` | Last reading, usage × rate × factor, per-room/month/type upsert; optional Excel import | Reuse two-meter calculation and prior-reading concept. Use numeric decimals, reject negative consumption, require a prior baseline or explicit initial zero; freeze billed readings. Excel deferred. |
| `server/routes/bills.js`, `payments.js` | Confirmed payments summed against bill; partial payment possible, paid when fully covered; manual collection | Reuse confirmed-payment sum and partial settlement. Enforce no overpayment and no duplicate confirmation with bill row locking and idempotency. Payment gateway and WeChat deferred. |
| `server/routes/contracts.js`, `schema.sql` | Contract binds tenant and room, monthly rent, deposit, pay day | Use existing `stayhub.leases` bound to verified Stay, account, unit and property. Lease is an agreement record, not a signed legal document. Snapshot rent on bill; keep deposit separate and out of initial monthly invoice. |
| `server/routes/dashboard.js`, `bills.js /stats` | Receivables, confirmed collections, fee categories, occupancy, deposit separated from income | Initially show only property-scoped billed total, confirmed collected, remaining balance and unpaid count from server data. No tax reporting, profit calculation or deposit income classification in P2.5-B. |

Source limitations to correct: `bills.js` reads `b.property_id` for authorization although LookHome bills schema lacks that field; `payments.js` likewise relies on a bill property field. Manual payment reads paid sum before its transaction, so concurrent confirmations can overpay. A bill may be voided after payment without guarding settlement. `bills.js /readings` clamps decreasing readings to zero, while the bulk import rejects them; use one strict rule. Room-level meter readings are not linked to an occupant or lease; prevent billing the wrong resident after transfer. LookHome uses floating-point `REAL`, integer IDs and SQLite/Express auth. None of those assumptions may be transplanted. Its `contracts` represent a different workflow from StayHub leases; do not reinterpret reservations as leases.

## Existing StayHub relationships and authorization

`db/migrations/001..009` define UUID accounts, properties and units, reservations and QR-bound stays. `properties.owner_account_id` and `property_memberships(property_id,account_id,role)` identify authorized owners/admins. `stays(property_id,unit_id,account_id,join_request_id,reservation_id)` represents approved residence. Migration 005 checks stay account against its join request; 008 checks reservation, property, unit and guest account together. Migration 007 creates `leases(property_id,stay_id,account_id,unit_id)` and a composite FK to the stay identity. One active lease per stay; terminated leases remain historical. `app/api/v2/leases/route.ts` authenticates session, checks owner/admin membership and derives account/unit from the locked Stay. Tenant QR creates a pending request; approval binds identity. Never infer access merely from a QR token or unit number.

| Identifier | Billing role | Required constraint |
| --- | --- | --- |
| `property_id` | Every invoice, reading, payment scope | Supplied property belongs to authenticated owner/admin; composite FKs prevent cross-property IDs. |
| `account_id` | Bill recipient from verified lease/stay | Tenant sees only own bills for a matching property and account, including historical stays; never accept account ID from bill-create body. |
| `stay_id` | Historical occupant at invoice creation | Link bill to exact stay; transfers create a new stay and must not retarget an old bill. |
| `unit_id` | Meter and bill location | Derived from lease; compare property/unit to reading; changing occupant or transfer requires explicit allocation policy. |
| `lease_id` | Monthly rent source and monthly duplicate key | Resolve lease under property and stay; terminated lease may have historical bills but cannot generate a new period outside its effective span. |
| `reservation_id` | Optional provenance through Stay | May be NULL; nightly reservation has no monthly lease. Do not create monthly invoices solely from reservation or expose another guest's bill. |

Existing `app/tenant/billing/page.tsx`, `components/AdminBillBuilder.tsx`, `components/MeterEntryWorkspace.tsx` and older Supabase/local flows are not evidence of PostgreSQL-backed billing: first identify their API/data source in P2.5-B before connecting UI. The current `app/api/v2` route set has no PostgreSQL bill, reading or payment endpoints. Existing `billing_mode` values (`monthly`, `nightly`, `mixed`) must gate monthly billing to leases, not all bookings.

## Proposed minimal migration (design only)

Create a reviewed next-numbered PostgreSQL migration in P2.5-B; do not execute it in P2.5-A. Prefer `numeric(12,2)` for money and `numeric(14,3)` for meter units; check finite, nonnegative amounts in API and DB. Store period as first day of month (`date`, day=1), all timestamps `timestamptz`, and present dates in `Asia/Bangkok`.

1. `billing_meter_readings`: UUID id, property_id, unit_id, meter_type (`water|electric`), period, previous/current readings, usage, rate and amount snapshots, recorded_by, created_at; unique `(property_id,unit_id,meter_type,period)`, composite unit FK. Explicit baseline entry required for first reading; forbid update/delete when referenced by a finalized bill.
2. `billing_bills`: UUID id, property_id, lease_id, stay_id, account_id, unit_id, period, bill_type (`monthly` initially), total, status (`unpaid|partial|paid|void`), created_by, created_at; unique `(property_id,lease_id,period,bill_type)`. Composite identity FK to lease requires a matching unique key on leases `(property_id,id,stay_id,account_id,unit_id)`; introduce it deliberately. Capture lease terms and recipient at issue time, do not regenerate a changed lease over an issued bill.
3. `billing_bill_items`: UUID id, property_id, bill_id, fee_code (`rent|water|electric|other`), label, quantity, rate, amount, optional reading_id; composite FK to bill; computed total must equal item sum in the issue transaction. Other is owner-entered, explicit, nonnegative, and not an accounting/tax category.
4. `billing_payments`: UUID id, property_id, bill_id, amount, method (`manual` initially), status (`confirmed` initially), confirmed_by, confirmed_at, idempotency_key; positive amount, composite bill FK and unique `(property_id,idempotency_key)` for nonnull keys. No direct client write; no silent delete. A correction needs a separately specified reversal/audit workflow before release.

Add property/period and recipient indexes; apply the schema's existing PUBLIC revocation policy. A property/account scoped FK or transaction validation must ensure a reading used as an item belongs to this bill's property/unit/period. For shared rooms or multiple consecutive stays within one period, block automatic meter allocation pending a clear split policy. Do not create separate tenant, room, contract or reservation copies.

## Minimal Next.js API contract (P2.5-B proposal)

All endpoints: existing server session, staging feature gate, origin check on mutations, strict UUID/period/decimal validation, parameterized PostgreSQL, `Cache-Control: no-store`; owner/admin verified by property membership on every operation. Tenant read checks `bill.account_id = session.account.id` and property. Use existing `withPostgresTransaction`, never client-supplied recipient or total.

| Route | Action |
| --- | --- |
| `GET /api/v2/bills?propertyId=...&period=...` | Owner/admin property list; tenant own list via account-scoped variant; bounded pagination. |
| `GET /api/v2/bills/[billId]` | Property + actor scoped bill, items, confirmed payment sum and outstanding balance. |
| `PUT /api/v2/meter-readings` | Owner records water/electric for property/unit/period; unit lock, prior-reading validation, uniqueness and billed-reading immutability. |
| `POST /api/v2/bills` | Owner issues one monthly bill for `propertyId,leaseId,period`, locks lease/stay/unit, validates effective dates and meter allocation; inserts immutable rent/utility/optional charge snapshots and total atomically. Unique key makes retry return existing bill or conflict on changed input. |
| `POST /api/v2/bills/[billId]/payments` | Owner manually confirms a positive amount with idempotency key; lock bill, recompute confirmed sum, reject overpayment or void bill, insert payment and derive partial/paid status atomically. |

No automatic charges, tax invoice, online payment, refund, Excel import, push reminder, signed contract, deposit settlement, nightly reservation billing or dashboard redesign in this minimal slice. A void action, if later added, must reject any confirmed payment and retain audit evidence. Dashboard aggregation can use the bill/payment read model in a later phase.

## P2.5-B implementation and gates

1. Validate existing legacy billing data paths and decide migration boundaries; review shared-unit, transfer, first-reading and terminated-lease rules before enabling invoice creation.
2. Add reviewed migration and server-only bill/meter/payment APIs on the existing branch, no production migration. Enforce composite identity and transaction guards before UI wiring.
3. Test two properties/two tenant sessions, QR approval, lease vs reservation, duplicate month/concurrent payment, transfer, partial payment, invalid/decreasing readings and cross-account access against isolated PostgreSQL with rollback.
4. Subsequent P2.5-C–F can connect existing UI, simplify dashboard and complete integration/release checks under separate instructions. No deployment until P2.5-A through F all pass and owner explicitly approves it.

## License

The supplied LookHome archive includes `LICENSE`: MIT, copyright © 2026 LookHome LookHome. The license permits reuse and modification if the copyright and permission notice accompany copied code or substantial portions. This plan copies no source code. If P2.5-B copies implementation, preserve the original notice in the repository/distribution and check any third-party assets/dependencies separately. Formulae and workflow ideas are described here without importing the Express/SQLite code or assets.
