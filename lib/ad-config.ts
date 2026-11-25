export const adConfig={
  mock:process.env.NEXT_PUBLIC_ENABLE_AD_MOCK==='true',
  // External creatives remain disabled until the provider, domain, zone,
  // content policy and sandbox behavior have been independently verified.
  contentLive:false,
  inPagePushLive:false,
  bottomLive:false,
  firstEntryLive:false,
} as const
