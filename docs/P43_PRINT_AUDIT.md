# P4.3 — Universal receipt printing and Auto Fit audit

Date: 27 November 2026 (Asia/Bangkok). Branch: `feat/stayhub-p26-readiness`.
Remote HEAD before changes: `f384aed30305c8a1c52a19e5f61aa0ab65fc562e`.

## Changes

- The existing paid receipt button now reads **พิมพ์ใบเสร็จ** and opens the browser's native print dialog. The cash receipt no longer has a paper-size selector. Printer, paper, copies, orientation and scale remain under the device's print dialog.
- Owner and tenant monthly receipts use shared, print-only CSS. The print view hides navigation, controls and other page content; it uses the available print width, wraps long text, constrains images/tables, and lets long documents break across pages. Cash receipts use the same approach in their existing isolated print iframe. No fixed `@page size`, forced scale, or printer connection was added.
- Existing bill/payment calculation, receipt data, document numbers, API and database schema were unchanged. A receipt remains unavailable until the bill is fully paid.

## Verification on isolated localhost PostgreSQL and Chromium

| Check | Result |
| --- | --- |
| TypeScript (`npm run typecheck`) | PASS |
| Production build (`npm run build`) | PASS; existing autoprefixer warning in `guesthouse.module.css` |
| Guesthouse, Daily, Homestay cashier flow and cash print, A4/A5/80 mm/58 mm | PASS, 12 Chromium PDF cases; 12 long Thai charge rows; PDF page counts 2/2/4/4 per type |
| Apartment owner and approved tenant paid receipt, A4/A5/80 mm/58 mm | PASS, 8 Chromium PDF cases; print button called native `window.print()` |
| Unpaid and partially paid bills | PASS; no printable receipt |
| Other account trying to access receipt | PASS; denied |
| Receipt PDF text and paper dimensions | PASS for the four attached examples; `pdftotext` extracts Thai text and amounts; `pdfinfo` shows A4, A5, 80 mm and 58 mm page widths respectively |
| Print overflow | PASS in Chromium DOM width checks at all four simulated page widths for cash receipts; monthly receipt print container did not overflow in the tested pages |
| Reprint | PASS; existing receipt reopened and printed; test did not create another payment |

The cash browser test uses `scripts/audit-live-property-types.mjs` with `UI_AUDIT_PRINT=true`. Monthly receipt and tenant authorization use `scripts/p57-receipt-browser-e2e.mjs`. Both run only with the isolated `stayhub_p26_ci` database on localhost. No production data or deployment was touched.

## PDF examples

- [Apartment A4](print-samples/p43/apartment-A4.pdf)
- [Guesthouse A5](print-samples/p43/guesthouse-A5.pdf)
- [Daily 80 mm](print-samples/p43/daily-80mm.pdf)
- [Homestay 58 mm](print-samples/p43/homestay-58mm.pdf)

## Limits

Chromium PDF export simulates the paper choices. Physical Windows/macOS/Android/iOS print dialogs, printer drivers, Wi-Fi/USB/Bluetooth printers, and actual paper output were not tested. The browser cannot set a driver's Auto Fit or scale option; the application adapts its document layout to the printable area. The long-entry fixture covers cash receipts; the apartment sample covers a standard monthly receipt.
