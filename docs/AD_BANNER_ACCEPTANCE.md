# Banner integration acceptance
Staging domain: stayhub-fsd-staging.up.railway.app
Production domain (separate approval): stayhub.tushub.com
Request two 300x250 display banner zones and one 300x100 banner zone (confirm desktop/mobile inventory).
Reserved server-side variable names: STAYHUB_AD_LEFT_URL, STAYHUB_AD_RIGHT_URL, STAYHUB_AD_BOTTOM_URL.
External scripts remain unconnected and live flags disabled. Mock iframe uses allow-scripts with restrictive CSP and an inline opaque-origin probe; no popup, top-navigation or same-origin permissions. Test verifies layout dimensions and sandbox probe, not provider compatibility. Provider domain/zone and age-appropriate category controls remain unverified. Do not mistake this for live integration.
