# Banner integration acceptance
Staging domain: stayhub-fsd-staging.up.railway.app
Production domain (separate approval): stayhub.tushub.com
The user reports Website 932445 (Mainstream) and three display banner zones approved for the StayHub staging domain: left 7659305–7659309, right 7659321–7659325, bottom 7659337–7659341. This approval has not been independently verified from the provider console.
All three MultiTag banners are 300x250. No in-page push is used.
The server reads only `STAYHUB_AD_LEFT_URL`, `STAYHUB_AD_RIGHT_URL` and `STAYHUB_AD_BOTTOM_URL`. Each URL must be HTTPS on the exact reviewed provider host. Invalid or missing values fail closed. The supplied URLs are not hardcoded into the client bundle.
The supplied script endpoints can execute only when the server-side staging gate and public zone flags are enabled. The gate requires Website 932445, three valid URLs and an explicit all-ages content review. That review has not been verified, so the gate remains unset. HilltopAds states that Mainstream cannot completely exclude gambling or dating creatives; do not describe it as an all-ages filter. No live request or creative compatibility has been verified. The sandbox permits scripts but denies same-origin, popups, top navigation and forms. The iframe CSP restricts script and asset hosts; if the provider requires a broader policy, leave live ads disabled pending provider review.

## Verification on 2026-11-25

- The prior upload check matched the three supplied endpoint strings; this revision reads those values only from the corresponding server-side environment variables. URL validation passed for the reviewed host and rejected HTTP, lookalike hosts, credentials, custom ports and query parameters.
- Chromium Mock Test passed at 360, 390, 430, 768, 1280, 1366, 1440, 1600 and 1920px for apartment, guesthouse, daily and homestay. It checked all tabs, iframe sizes, no horizontal overflow, print, offline, dialog hiding, login exclusion and no browser errors or vendor requests.
- A second mock run set all three public live flags to `true`, provided three valid dummy provider-host URLs, and left `STAYHUB_AD_ALL_AGES_APPROVED` unset. The server gate stayed closed and Chromium still made zero vendor requests.
- TypeScript and Next.js build passed locally against the branch. Screenshots: [desktop](screenshots/shared-ads-desktop.png) and [mobile](screenshots/shared-ads-mobile.png).
- **Live Test: BLOCKED.** No all-ages category-control evidence or provider-approved sandbox behavior was available. No external creative was rendered or inspected.
- **Railway Staging Deployment: BLOCKED.** This environment has no Railway deployment connector or credentials; the staging HTTP endpoint returns proxy 403. No production deployment was performed.
