# StayHub banner layout — 1280px revision

- Left and right: 300 × 250 MultiTag creatives displayed at 180 × 150 CSS px inside sandboxed iframes. Bottom stays 300 × 250.
- Side slots mount from 1280 CSS px. Each slot can be disabled independently with `STAYHUB_AD_ENABLE_LEFT`, `STAYHUB_AD_ENABLE_RIGHT`, or `STAYHUB_AD_ENABLE_BOTTOM` set to `false`. A disabled side leaves its width to the main workspace.
- `STAYHUB_AD_ALLOWED_HOSTS` is a comma-separated exact hostname allowlist for approved HTTPS banner providers. URLs still require the individual `STAYHUB_AD_LEFT_URL`, `STAYHUB_AD_RIGHT_URL`, and `STAYHUB_AD_BOTTOM_URL` settings. The default host remains `shameful-farm.com`.
- The existing live gate also requires the staging environment ID, site ID, public per-slot flag, and `STAYHUB_AD_ALL_AGES_APPROVED=1`. This approval flag must only be set after content suitability has been independently confirmed. Provider Mainstream classification alone cannot guarantee exclusion of gambling or dating ads.
- No popup, popunder, top navigation, or in-page push is enabled. The iframe sandbox and CSP remain in place.
- Mock Chromium tests cover four property types, nine widths, disabled slots, print, offline, and no horizontal scroll. Live provider rendering and staging deployment require separate verification.
