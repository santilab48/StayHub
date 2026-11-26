# AdSense staging adapter

The AdSense provider is selected with `STAYHUB_AD_PROVIDER=adsense`. HilltopAds URLs and live switches are ignored by this provider. The default configuration in `.env.example` disables all three units. Each unit also needs a Google issued numeric slot ID, the registered client ID, `STAYHUB_ADSENSE_APPROVED=true`, and `STAYHUB_AD_ALL_AGES_APPROVED=1`. These last two gates must only be set after Google site approval and the Brand safety controls have been reviewed. Until then, the adapter makes no Google requests.

The left and right units use a real 180 × 150 display area; the bottom unit uses 300 × 250. The AdSense adapter does not apply CSS zoom or transforms to Google ads. It uses a sandboxed iframe with `allow-scripts`, no same-origin or navigation permission, no referrer, and no access to StayHub session or business DOM. AdSense rendering inside this sandbox has **not** been verified by Google or tested live. Validate the sandbox method and Google policy before enabling live units. Do not enable Auto Ads, popup or popunder formats.

AdSense approval is pending. Brand safety blocking for adult, gambling, dating, and other sensitive categories has not been verified. Mock browser checks are separate from live creative acceptance. No Production configuration is changed by this adapter.
