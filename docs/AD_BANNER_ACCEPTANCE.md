# Banner integration acceptance
Staging domain: stayhub-fsd-staging.up.railway.app
Production domain (separate approval): stayhub.tushub.com
The user reports Website 932445 (Mainstream) and three display banner zones approved for the StayHub staging domain: left 7659305–7659309, right 7659321–7659325, bottom 7659337–7659341. This approval has not been independently verified from the provider console.
Left and right are 300x250; bottom is 300x100. No in-page push is used.
Reserved server-side variable names for future URL rotation: STAYHUB_AD_LEFT_URL, STAYHUB_AD_RIGHT_URL, STAYHUB_AD_BOTTOM_URL. The current three URLs are fixed in reviewed code; these variables are not read by the app.
The supplied script endpoints are integrated as fixed URLs in the client bundle but cannot execute without both public zone flags and a server-side staging gate requiring Website 932445 and explicit all-ages category approval. The all-ages gate remains unset. No live request or creative compatibility has been verified. The sandbox permits scripts but denies same-origin, popups, top navigation and forms. The iframe CSP restricts script and asset hosts; if the provider requires a broader policy, leave live ads disabled pending provider review.

## Verification on 2026-11-25

- Uploaded endpoint strings matched the fixed left, right and bottom URLs exactly after normalizing `https:`.
- Chromium Mock Test passed at 360, 390, 430, 768, 1280, 1366, 1440, 1600 and 1920px for apartment, guesthouse, daily and homestay. It checked all tabs, iframe sizes, no horizontal overflow, print, offline, dialog hiding, login exclusion and no browser errors or vendor requests.
- A second mock run set all three public live flags to `true` while leaving `STAYHUB_AD_ALL_AGES_APPROVED` unset. The server gate stayed closed and Chromium still made zero vendor requests.
- TypeScript and Next.js build passed locally against the branch. Screenshots: [desktop](screenshots/shared-ads-desktop.png) and [mobile](screenshots/shared-ads-mobile.png).
- **Live Test: BLOCKED.** No all-ages category-control evidence or provider-approved sandbox behavior was available. No external creative was rendered or inspected.
- **Railway Staging Deployment: BLOCKED.** This environment has no Railway deployment connector or credentials; the staging HTTP endpoint returns proxy 403. No production deployment was performed.
