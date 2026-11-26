# StayHub UI/UX and functional audit — 26 November 2026

Scope: `feat/stayhub-p26-readiness`, starting at `613a05200f033a5827a552c15f13fc6b2c3121b1`. Tests used disposable localhost PostgreSQL 16 (`stayhub_p26_ci`) and Chromium. No Production or Staging data was written.

TypeScript check and Next.js production build: PASS.

## Verified

| Area | Evidence | Result |
| --- | --- | --- |
| Apartment owner dashboard | `scripts/audit-apartment-tabs.mjs`: clicked every dashboard tab at 360, 390, 430, 768, 1280, 1366, 1440, 1600, and 1920px; checked page overflow and browser errors | PASS |
| Guesthouse, daily, homestay | `scripts/audit-owner-previews.mjs`: clicked every top tab at the same nine widths in isolated preview pages | PASS for preview UI |
| Tenant dashboard and navigation | `scripts/test-tenant-preview.mjs`: six tabs, five widths, legacy route redirects | PASS for preview UI |
| Tenant approved device and contract | `scripts/p26-tenant-billing-ui-e2e.mjs`: 390px six tiles, orange colors, contract and print control, using isolated PostgreSQL | PASS |
| QR and PWA | `scripts/p26-tenant-pwa-browser-e2e.mjs`: invitation, install screen, pending/approval, reopened app, revocation | PASS in Chromium emulation; physical devices not tested |
| Room contract billing | `scripts/p26-room-billing-browser-e2e.mjs`: meter input, bill creation, totals, partial/full payment, receipt, PDF failure rollback | PASS |
| Owner receipt list | `scripts/p26-receipt-list-e2e.mjs`: unpaid/partial hidden, paid balance shown | PASS |
| Printable tenant receipt and isolation | `scripts/p57-receipt-browser-e2e.mjs`: paid PDF, denied for unrelated account, no receipt before settlement | PASS |
| Auth, authorization, room sync, billing | `scripts/p26-http-e2e.mjs` against isolated PostgreSQL | PASS at HTTP/API level |

## Fixes

- Corrected the dashboard menu accessible name for daily and homestay; it previously said guesthouse on both pages.
- Updated the tenant document browser test to select the document tile explicitly after the new tab menu added a second link with the same name.
- Allowed the receipt browser test to use the installed Chromium binary in local test environments.

## Incomplete checks

- The older `scripts/cloud-browser-e2e.mjs` mock workflow is out of date: the landing screen changed, and its lease fixture returns no selectable occupancy. It did not pass as a whole. The tested onboarding and room creation steps passed during diagnosis; lease and later steps in that script remain unverified by that script.
- The three non-apartment property types were checked in preview mode, not by creating and editing every real booking, payment, cancellation, and form state against PostgreSQL.
- A complete click-by-click inventory of every button, popup, loading/empty state, document, and responsive width is not established. The checks above are targeted coverage, not full acceptance.
- Railway Staging deployment and URL health cannot be verified from this workspace. A successful Git push alone is not proof of deployment.

The current findings do not support marking the full UI/UX audit as complete.
