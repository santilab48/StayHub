# StayHub automatic invoice PDF — verification

Date: 24 November 2026 (Asia/Bangkok). Branch: `feat/stayhub-p26-readiness`. Base remote HEAD: `61bf1e1287aee57d1e3a2fcbc909a676c048fb4c`.

## Implemented

- Migration `017_billing_invoice_documents.sql` adds one private PDF BYTEA document per bill, property and bill foreign keys, SHA-256, filename, MIME, creation time, and an optional recipient account constrained to the bill's immutable verified lease account. Room-contract bills without an approved account have a null recipient and stay owner-only.
- The existing owner issue action creates the bill, items and embedded-font A4 PDF in one PostgreSQL transaction. An invoice failure rolls back the bill and items while previously saved meter readings remain. No separate create/send action was added.
- `GET /api/v2/bills/[billId]/pdf` checks session and property ownership or exact recipient account each request; private no-store response, no public URL. The existing print-bill action opens the stored PDF when present; old bills retain their prior print behavior. Existing owner summary/history and tenant bill history use the same persisted bill after commit.
- Thai/Latin font is embedded in a vector PDF; it is not a screenshot. The merged font is based on Noto fonts under OFL-1.1, with license in `assets/fonts/NOTO_LICENSE.txt`.

## Tests actually run

- PostgreSQL 16 isolated database: migrations 001–017 applied, 17/17. HTTP auth/lease/billing/payment suite passed; approved tenant and owner retrieved PDF, unrelated owner received 404, anonymous received 401; idempotent bill replay, duplicate month, overpayment prevention and owner summary passed.
- Real Chromium isolated database: saved water/electric meter, used existing owner confirm button, forced PDF insert failure and observed **zero bill rows with both meter rows retained**, then issued successfully. One document per bill, SHA-256 match, owner PDF 200, unverified room-contract tenant 404. Partial/full payment and existing paid receipt passed. Layout had no horizontal overflow at 360, 390 and 1280 pixels.
- Generated PDF inspected by renderer: 1 A4 page, embedded Thai text readable, correct visible 4,350.00 THB total and meter/line-item amounts. Local database check after tests: 10 bills / 10 documents, 7 owner-only documents, 0 recipient mismatches. These are disposable fixtures, **not Staging/Production data**.
- `npm run typecheck` and `npm run build` passed after the code changes.

## Remaining gates

- This environment has no Neon/Railway Staging credential or management connector. HTTP request to `https://stayhub-fsd-staging.up.railway.app/api/health/db` was blocked by outbound proxy (`CONNECT tunnel failed, response 403`). Thus migration 017 was **not installed on real Staging**, Railway Staging was **not deployed**, GitHub Actions result for the new commit has not yet been established, and live PostgreSQL document rows have not been checked. Do not call Staging acceptance complete until these checks pass. Keep Production untouched.
- Legacy lease records contain a verified tenant account but no contractual tenant name, property address or due day in this schema. The PDF shows the account email and explicit missing-field text rather than inventing these values. Room contracts contain tenant name, property address and due day but no approved account identity, so those PDFs remain owner-only.
- Invoice documents are generated for **new** bills; historical bills have no backfilled PDF. Their existing detail/print behavior remains available.

## CI follow-up

The first pushed commit `a9972da` triggered GitHub Build/Security run `45372761958`, which failed because the existing local-sync contract still expected a literal 16-migration health expression. The production migration limit remains unchanged; the contract was updated to assert Neon Production 13, Railway Production 16, and isolated/Staging 17. The matching local structure, migration, identity, sync, IndexedDB/backup (13/13), P1 audit, typecheck and build checks passed. A new CI run is required for the follow-up commit before claiming GitHub Actions pass.

## GitHub CI result for code commit `b905b96`

The public GitHub Actions pages for this code commit report **Success**: Build/Security runs `45373077989` and `45373064240`; isolated PostgreSQL/HTTP/Chromium run `45373077986`; the earlier isolated run `45373064504` also completed successfully. The initial failed Build/Security run `45372761958` belongs to the preceding commit and was addressed by the health-contract correction. These are CI results only. **Neon Staging migration 017, Railway Staging deployment and live invoice/tenant acceptance remain BLOCKED and unverified** in this environment.
