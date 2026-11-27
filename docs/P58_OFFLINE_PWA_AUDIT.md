# StayHub P5.8 — Offline, IndexedDB and PWA audit

Date: 2026-11-23 (Asia/Bangkok)

## Result

**PASS — isolated Chromium PWA and IndexedDB persistence E2E.** Verified via a real registered Service Worker, browser going offline, closed-and-reopened browser tab, reconnect, local storage inspection and authenticated-cache isolation. Production app and PostgreSQL remain Online, with no P5.8 deployment or data writes.

Repository `santilab48/StayHub`; branch `feat/stayhub-p26-readiness`; tested commit `c9d6e4f2af5eda0b6c968e97c8b2fa69671c869a`.

## Scope and method

- Added `scripts/p58-offline-pwa-e2e.mjs`: real headless Chromium context with `serviceWorkers: 'allow'`, isolated CI localhost server and disposable PostgreSQL identity guard (`CI=true`, loopback host `127.0.0.1`, database `stayhub_p26_ci`, base `http://127.0.0.1:3000`). There is no test write to Railway or Neon.
- Existing PWA manifest reports `display='standalone'` and scope `/`. The app registers `/sw.js` on the local Workspace, and the test waits for the controlling Service Worker.
- Warmed a controlled online `/workspace` navigation, confirmed shell was cached, disconnected the Chromium context, then **reloaded the page while offline**.
- While fully offline, created a local room, saved a water meter value, and created a bill Draft of THB 123.45. Verified IndexedDB stores `units`, `meter_readings`, `bills`, `bill_items` and `sync_queue`, including three **pending** operations. Bills and readings remain local-only and are not issued by room sync.
- Closed the browser tab, opened a new tab **still offline**, loaded `/workspace` from cached Service Worker assets, and verified all records and queued changes persisted unchanged.
- Reconnected to the server, reloaded, confirmed all local drafts and pending operations were still intact, with no implicit meter or bill push.
- Enumerated all CacheStorage request paths and verified **no /api/, /cloud or /platform** content was cached. This does not imply that static code is secret-free; the CacheStorage test covers URL paths and bounded Service Worker interception.
- Original `public/sw.js`, IndexedDB schema, application UI and service-worker registration logic needed **no modification**. A first test failure was an overly broad browser selector matching the room name in three separate sections; the test was corrected to scope the selector to the Rooms section.

## Actual CI evidence

Tested commit: `c9d6e4f2af5eda0b6c968e97c8b2fa69671c869a`

- GitHub Actions **Build & Security**: run `45144886467`, **SUCCESS**.
- GitHub Actions **isolated PostgreSQL HTTP + Chromium**: run `45144886540`, job `137591614456`, **SUCCESS**.
- Job logs:
  - `PASS PWA manifest and active controlling service worker`
  - `PASS offline cache excludes authenticated APIs and Cloud pages`
  - `PASS offline room, water meter and bill draft persist in IndexedDB queue`
  - `PASS offline closed/reopened tab loads cached shell with all drafts`
  - `PASS reconnect/reload does not silently send meter or bill drafts`
  - `PASS P5.8 isolated Chromium PWA offline persistence and cache isolation`
- Earlier P5.3 two-context offline Conflict and P5.7 receipt/PDF Chromium regression tests also **passed** in this same workflow.
- https://github.com/santilab48/StayHub/actions/runs/45144886540
- https://github.com/santilab48/StayHub/actions/runs/45144886467

## Production status and limitations

Railway management read-only check after tests:
- Production StayHub app: **Online**, deployment `173c27ab-cd5a-4e04-a611-a6c8c1cf42f5`, status **SUCCESS**.
- Existing Railway PostgreSQL `Postgres-PDqf`: **Online**, status **SUCCESS**.
- Production code remains pinned to `d163b4d167f8686e8015c8797d5eb0bdcc635c17`. P5.8 is test/CI-only work, not a Production release.

**Not proved by this suite:** complete browser-profile deletion/corruption recovery, iOS Safari/Android physical PWA installation, network flapping and quota-exhaustion behavior across physical devices, long-term data retention without a backup, or service-worker upgrades with real end-user caches. Data stored only in IndexedDB can be lost on browser data clearing; use the existing encrypted backup workflow.

There was no UI/UX change, no Production data write or migration, no Railway variables or service changes, and no merge of Draft PR #2.

Next: **P5.9** verify Security/Backup/Rollback; **P5.10** final readiness summary. P5.6 Platform Super Admin remains disabled and P5.5 authorized Production Write E2E remains unverified.
