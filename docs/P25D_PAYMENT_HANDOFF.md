# StayHub P2.5-D — Simple payment recording handoff

Date: 2026-11-22. Continue from local branch `feat/stayhub-p25c-local` at `54c7fcf`, retaining P2.5-B `06b665f` and migrations 010–011. Remote original feature branch was `52c4f4b` when this task started. The existing uncommitted build-generated `next-env.d.ts` was preserved and excluded from this commit.

## What changed

- `app/api/v2/bills/[billId]/payments/route.ts` provides `POST` for authenticated property owner/admin to record a confirmed cash or transfer receipt and `GET` for owner/admin to see receipts and the balance. A resident can GET only a bill whose `account_id` matches their authenticated account, returning status/paid/outstanding without owner confirmation metadata or unrelated payments. Both operations filter by `property_id` **and** `bill_id`; there is no access by unit alone.
- `lib/db/billing-calculation.ts` adds `paymentBalance` for exact integer-cent paid and outstanding arithmetic.
- `scripts/test-payment-recording.mjs` covers the 4,000 → 1,500 → 2,500 arithmetic and static property/account, locking, idempotency, overpayment and immutable-payment contracts.

The POST body accepts `{propertyId, amount, method}`; `amount` is a positive decimal string with at most two fraction digits and `method` is `cash` or `transfer`. The URL contains `billId`; the header requires a 16–128 character `Idempotency-Key`. Client-supplied totals, balance, tenant IDs and payment status are ignored. Session and origin checks follow existing staging-only Next.js API conventions. No new authentication system or payment gateway is introduced.

The transaction checks property membership, locks the selected bill row, checks a prior key before changing money, rejects reuse of a key with different bill/amount/method, rejects paid/void/unfinalized bills, sums confirmed receipts from PostgreSQL, and rejects amounts over the bill total. It inserts one immutable `billing_payments` row with `confirmed_by` and database default `confirmed_at`. The P2.5-B migration 010 trigger also locks the bill, checks overpayment and updates its status to `partial`/`paid` in the same transaction; the API returns the corresponding balance. A repeat of the same key and payload replays the original receipt without inserting another, even after the bill becomes paid. The database unique key `(property_id,idempotency_key)` protects concurrent duplicate submissions.

## Schema and verification

No migration 012 is required: migration 010 already provides payment method checks, property/bill composite FK, positive amount, idempotency uniqueness, receipt immutability and row-lock payment trigger. Migrations 010 and 011 and the P2.5-C bill API were not changed.

Local tests: payment arithmetic/static contract, P2.5-C bill tests, P2.5-B migration contract, existing migration/ID binding/structure regression, TypeScript and Next.js production build. **No independently verified disposable PostgreSQL test database was available**; real migrations, concurrent transaction behavior, trigger execution, GET/POST HTTP identity isolation and rollback are not yet proven. Before release, run 001–011 in an isolated test database and test partial/full/overpayment, simultaneous POSTs, same-key replay and changed payload, cross-property payment, A vs B resident reads, void/unfinalized/paid bills and immutable payment update/delete. Never use staging or production for those experiments.

This is local-only work. Do not push the original branch while Railway Auto Deploy follows it; no deployment, environment migration, Neon migration or merge was performed. The owner will control deployment separately. Next step P2.5-E requires a separate instruction.
