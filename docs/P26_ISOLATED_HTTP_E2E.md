# StayHub P2.6 — Isolated HTTP E2E acceptance evidence

Date: 2026-11-22 (Asia/Bangkok)  
Repository: `santilab48/StayHub`  
Branch: `feat/stayhub-p26-readiness`  
Acceptance commit: `127b35233b477010a6be4f18996b284c71df5cea`

## Scope and isolation

The E2E workflow runs Next.js at `http://127.0.0.1:3000` with a temporary PostgreSQL 16 GitHub Actions service container. The guard in `scripts/p26-ci-migrate.mjs` refuses nonlocal hosts and database names other than `stayhub_p26_ci`. The HTTP test runner refuses non-CI execution and URLs other than localhost. Railway production and staging PostgreSQL databases are **not used** for test writes.

Actions evidence:
- [Auth/QR/Billing E2E workflow SUCCESS](https://github.com/santilab48/StayHub/actions/runs/45022228986)
- [Earlier Auth/QR-only E2E SUCCESS](https://github.com/santilab48/StayHub/actions/runs/45022129424)
- [Read-only staging smoke SUCCESS](https://github.com/santilab48/StayHub/actions/runs/45021949498)

## Results

- PostgreSQL migrations 001–011 applied in order on disposable CI PostgreSQL: **11/11**.
- Readiness endpoint `/api/health/db`: HTTP 200.
- Registration for two separate owners and one tenant, session issuance, rejection of anonymous requests, invalid credentials, logout/session revocation and fresh login: PASS.
- Owner creates property, room and invitation; tenant requests QR join; owner approves; tenant sees assigned stay: PASS.
- Cross-property denial on units, leases, meter writes and join requests: HTTP 403. Other owner cannot read tenant bill: HTTP 404.
- Owner creates lease and November 2026 water/electric readings, then issues a bill with **4,000.00 THB rent + 100.00 THB water + 200.00 THB electric + 50.00 THB other = 4,350.00 THB**: PASS.
- Repeated bill creation with the same idempotency key returns the same bill: HTTP 200, PASS.
- Tenant reads their bill but cannot confirm payment: HTTP 403, PASS.
- Partial payment **1,500.00 THB** changes status to `partial` with **2,850.00 THB** outstanding: PASS.
- Concurrent payment submissions for **2,850.00 THB** with distinct keys: exactly one HTTP 201 and one HTTP 409; final status `paid`, sum **4,350.00 THB**, exactly two payment records: PASS.
- Tenant bill history: HTTP 200, PASS.

## Limitations and pending release gates

This proves an **isolated HTTP integration run**, not authenticated browser testing or a production traffic simulation.

Still pending: browser UI at 360/390/768/1280 px with screenshots; repeated button-click UX; email recovery/verification and bot/edge throttling; live storage and legacy Supabase feature migration; live system operational monitoring; and a reviewed Production release/rollback plan. Do not merge or deploy this branch to Production without explicit approval.

The Railway staging project follows `feat/stayhub-p26-readiness`; Production follows `feat/stayhub-p1-security-staging-audit`. Production must remain unchanged during P2.6 work.
