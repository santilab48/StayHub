# Planned HiiAds banner integration

**Status: planned only; no advertising code is active.**

The owner requested future HiiAds advertising banners in StayHub. Their exact placement will be decided later. Do not preselect the landing screen, registration, dashboard, payments, or any other page.

Implementation after placement approval:
- Define one dedicated, responsive component and reserve its layout dimensions to prevent content shifts.
- Keep ad content visually separate from StayHub controls and label it as advertising.
- Obtain the provider's embed parameters and validate the integration, including mobile behavior, audience suitability, privacy/consent, Content Security Policy and provider policy.
- Avoid loading ads before users finish selecting an accommodation type and registering, unless the owner explicitly chooses otherwise.
- Keep ad slot IDs in non-secret configuration; do not commit credentials or third-party scripts before approval.

No ad request, script, account configuration, or banner position is introduced by the onboarding change.
