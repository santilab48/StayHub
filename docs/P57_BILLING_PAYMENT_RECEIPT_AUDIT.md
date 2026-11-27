# StayHub P5.7 — Billing, meter, payment and print-to-PDF regression audit

Date: 2026-11-23 (Asia/Bangkok)

## Result

**PASS — isolated PostgreSQL HTTP integration and real Chromium receipt/PDF rendering.** Production was checked read-only and remained healthy. This result does **not** claim a Production write E2E.

Repository: `santilab48/StayHub`; branch `feat/stayhub-p26-readiness`.  
Code under test: `9cbc128bd20d6f48c3a12de9305d2b467bd9b06c`.  
Production source remains pinned to `d163b4d167f8686e8015c8797d5eb0bdcc635c17`, deployment `173c27ab-cd5a-4e04-a611-a6c8c1cf42f5` — no P5.7 production release.

## Tested changes

1. Extended existing `scripts/p26-http-e2e.mjs` for meter guards:
   - Reject subsequent decreasing reading; reject invalid monetary unit rates; reject backdated reading when a later period already exists; preserve unique monthly meter record rule.
2. Reconciled bill line-item amounts, unpaid/partial/paid balances and billing summary:
   - Example test: rent THB 4,000 + water THB 100 + electricity THB 200 + other THB 50 = **THB 4,350**; total line-item cents exactly equal total.
   - Unpaid summary: THB 4,350 billed, THB 0 paid, THB 4,350 outstanding.
   - Partial payment THB 1,500 yields THB 2,850 outstanding, matching detail and summary.
   - Full payment yields THB 4,350 paid, THB 0 outstanding, matching detail/summary/paid-only history.
   - Explicitly reject payment exceeding balance by THB 0.01, negative and zero payments, post-settlement payments, and modified-idempotency-key replay.
   - Existing tests still enforce same bill idempotent replay, different-key monthly bill duplicate rejection, and concurrent final payments allowing exactly one accepted transaction.
   - Owner-only summary access; tenant may view their bill but not the owner payment-ledger entries. Unrelated account cannot access another bill. Invalid status and page filters rejected.
3. Added `scripts/p57-receipt-browser-e2e.mjs` with mandatory CI+localhost PostgreSQL identity guard, and included it in the existing isolated GitHub Actions HTTP/Chromium workflow:
   - Two browser accounts have valid owner and tenant roles; an unrelated third account is denied.
   - An **unpaid** bill does not show a printable receipt.
   - A **partially paid** bill does not show a printable receipt.
   - A **paid** bill shows the receipt and a print/PDF button.
   - Chromium `page.pdf()` produced a **valid 1-page PDF, 82,644 bytes**, loaded successfully with `pdf-lib` (`PDFDocument.load`). The browser DOM showed the settled receipt and amount.
   - Unrelated account cannot open/print the receipt; approved tenant can view their settled receipt.
   - Existing Chromium two-context offline room sync regression also passed again.

**PDF caveat:** The product uses the browser's **Print / Save as PDF** path, not a standalone backend PDF download endpoint. The CI test verifies successful rendered PDF structure, one page, and allowed screen visibility; no manual/visual PDF typography or printer-specific layout review was performed.

## Verified execution evidence

- GitHub Actions **Build and Security**: `45140287414` — **SUCCESS** (build/type check; no deploy).
- GitHub Actions **Isolated PostgreSQL HTTP + Chromium**: `45140287248` — **SUCCESS**, job `137576299847`.
- Disposable PostgreSQL was reached at loopback `127.0.0.1` with DB `stayhub_p26_ci`, using existing 14-migration CI guard; test-only accounts, bills, and payment rows stayed there.
- Direct job log highlights:
  - `PASS owner summary before payment 200`
  - `PASS overpayment of one satang denied 409`
  - `PASS paid bill summary 200`
  - `PASS P2.6 isolated Auth/QR/Billing/permission HTTP E2E`
  - `PASS P5.3 real Chromium two-context / isolated PostgreSQL E2E`
  - `PASS unpaid bill has no printable receipt`
  - `PASS partially paid bill has no printable receipt`
  - `PASS paid receipt browser PDF rendered (82644 bytes, 1 pages)`
  - `PASS unrelated account cannot view or print another tenant receipt`
  - `PASS approved tenant can view settled receipt`
  - `PASS P5.7 isolated Chromium paid receipt PDF E2E`

URLs:
- https://github.com/santilab48/StayHub/actions/runs/45140287414
- https://github.com/santilab48/StayHub/actions/runs/45140287248

## One test-fixture issue resolved

PostgreSQL returns a zero-valued numeric aggregate as `"0"` in some summary responses, whereas the initial test expected `"0.00"`. The **value was correct**, but the test assumed a presentation scale. The test now compares validated monetary values in integer satang; **no billing handler, calculation, ledger, DB schema or customer data was changed**.

## Production safety and remaining limitations

- Railway Production App `StayHub` and existing PostgreSQL `Postgres-PDqf` were verified **Online, 1/1 replicas each, zero warning and zero critical issues**.
- Production source configuration remained pinned to `d163b4d167f8686e8015c8797d5eb0bdcc635c17` and deployment `173c27ab-cd5a-4e04-a611-a6c8c1cf42f5` remained **SUCCESS**.
- No Production data write, test account, test bill, variable change, migration, code deployment, UI/UX modification or PR merge was performed.
- **Production Write E2E is not verified**; these tests prove isolated integration behavior. PDF visual quality on varied mobile/print settings, independent direct Production DB ledger querying, and physical-device printing are also outstanding.
- This P5.7 task added tests/CI only; Platform Super Admin is still disabled per P5.6 and is not newly validated here.

**Next:** P5.8 Offline/IndexedDB/PWA persistence and service-worker safety; P5.9 backup, security and rollback; P5.10 final readiness audit.
