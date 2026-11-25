# StayHub Shared Ad Layout — staging mock verification

The owner dashboard for apartment, guesthouse, daily and homestay uses one shared layout. The staging environment ID enables **mock creatives only** at build time. Production and all live ad flags remain disabled. No HilltopAds URL, external script, customer data, session or token is sent to a creative.

## Placement and behavior

- From 1600px, the layout mounts a 300×250 left mock and a 300×300 right mock. At 1840px and above the main column caps at 1200px with symmetric side gutters.
- Below 1600px, side components are not mounted. The 300×100 bottom mock is available on desktop and mobile.
- Each creative is a sandboxed `srcDoc` iframe with a restrictive CSP and no scripts. IntersectionObserver delays iframe mounting until the slot nears the viewport.
- Offline, open dialogs, disabled mock mode and print mode remove or hide the ad layout without reserving side gutters. Login, registration, QR entry and printable documents never mount this layout.
- No live provider script is configured. Domain approval, zone approval, creative content policy and provider behavior in a sandbox remain unverified.

## Isolated verification

`scripts/test-shared-ad-layout.mjs` passed in Chromium with a disposable PostgreSQL database and mock data on 2026-11-25. It checked all four property types, every dashboard tab, viewport widths 360, 390, 430, 768, 1280, 1366, 1440, 1600 and 1920px, dimensions, symmetric desktop gutters, no horizontal page scrolling, print, offline, dialog hiding, login exclusion and browser JavaScript errors. TypeScript and Next.js build passed.

Screenshots: [desktop](screenshots/shared-ads-desktop.png) · [mobile](screenshots/shared-ads-mobile.png). These show mock creatives and preview data only.

## Staging verification still required

The execution environment cannot access the Railway staging service: its outbound proxy returns HTTP 403 before the request reaches the app. There is no Railway deployment or environment-variable connector available here. Therefore deployment success, staging runtime logs, and provider domain/zone approval are **not verified**. Live ads must remain disabled.

Staging links (after deployment): [Apartment owner dashboard](https://stayhub-fsd-staging.up.railway.app/cloud?type=apartment) · [Guesthouse preview](https://stayhub-fsd-staging.up.railway.app/preview/guesthouse) · [Daily preview](https://stayhub-fsd-staging.up.railway.app/preview/daily) · [Homestay preview](https://stayhub-fsd-staging.up.railway.app/preview/homestay).
