# StayHub P5.3 — Isolated CI + Two-Context Chromium Browser E2E

**Date:** 2026-11-23 Asia/Bangkok  
**Repository:** `santilab48/StayHub`  
**Branch:** `feat/stayhub-p26-readiness`  
**Validated application commit:** `13f3d14ce61dd454819451bc68553e1eb19b004a`  
**Draft-only review:** https://github.com/santilab48/StayHub/pull/2

## Summary

P5.3 verified the Local-First room sync implementation against **a disposable PostgreSQL database and two real Chromium browser contexts**, each with isolated cookies and browser IndexedDB. No test traffic or test records were written to Railway/Neon Production. No business UI, CSS, routes, billing/payment functions or deployed Production code was changed as part of P5.3. The production service remains pinned to P4 commit `366bbbd4a1ef4f3934eddc50f5bc1f826df76178`.

## CI results, directly observed

1. **Build/Security Workflow:** `StayHub P1 build and security check (no deploy)` — **SUCCESS**, GitHub Actions run `45136280389`. This includes static security/routing checks, Local-First contract checks, IndexedDB regression, typecheck and production Next.js build. The Railway Staging build gate also passed **12/12 tests** after the fixes below.
2. **Isolated PostgreSQL + HTTP + Chromium Workflow:** `StayHub P2.6 isolated Auth and QR HTTP E2E` — **SUCCESS**, run `45136280386`, job `137563233139`. Migration runner required `CI=true`, `DATABASE_URL` hostname `127.0.0.1` and DB name `stayhub_p26_ci`. **14/14 migrations** applied to isolated CI PostgreSQL. The HTTP suite passed including authenticated GET/POST room sync, cross-property access denial, request idempotency and conflict revisions, QR/auth/billing tests.
3. **Real Chromium Two-Context E2E:** The same successful workflow booted headless Chromium with two distinct browser contexts, created the same authorized server property login in both contexts, and tested the existing UI workflow. The job emitted:
   - `PASS Chromium contexts A → server → B room transfer`
   - `PASS offline B edit retained through conflicting pull`
   - `PASS conflict rebase and browser B → server → A return transfer`
   - `PASS both browser IndexedDB stores persist after reload`
   - `PASS P5.3 real Chromium two-context / isolated PostgreSQL E2E`

CI: https://github.com/santilab48/StayHub/actions/runs/45136280386  
Build/security: https://github.com/santilab48/StayHub/actions/runs/45136280389

## Defects found and resolved before pass

- A server-accepted rebased edit could leave local room revision stale for the next offline edit. `lib/local-db/sync.ts` now persists a higher server revision even when room name is unchanged.
- Earlier two-device simulation incorrectly shared the same IndexedDB object store. Tests now use **independent IDBFactory + matching IDBKeyRange per simulated device**.
- Browser UI validation initially asserted sync button availability before asynchronous local property linking completed. The Playwright runner now waits for the enabled button.
- The CI workflow now has a `pull_request` trigger so authorized reviewers can inspect actual isolated integration results. Draft PR #2 remains **unmerged**.

## Remaining scope and rollout decision

- These tests use independent Chromium contexts on a single CI host plus disposable CI PostgreSQL. They are not physical-phone or real-network-failure tests, and the feature is limited to **room names**. Offline meter readings and bill drafts remain local-only and are not server-issued bills or payments.
- Production has **not** received the P5.2/P5.3 server-pull code: current Production is `366bbbd4` (P4 push/sync release). The branch's latest code is staged and tested, not Production.
- Do not merge Draft PR #2 or change the pinned Railway Production deployment without a separate authorized promotion step. For promotion: snapshot current Production and verify its stable database, deploy the tested branch commit intentionally, verify `/api/health/db`, re-run a credentialed owner sync against a **dedicated test property** and confirm no billing changes; keep the previous successful Railway deployment for rollback.

## No UI change

P5.3 only adds browser tests and their isolated GitHub Actions workflow. Existing workspace layout, buttons and texts remain unchanged, including legacy wording referring to Staging.
