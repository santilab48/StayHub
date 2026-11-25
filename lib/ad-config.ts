export const adConfig={
  mock:process.env.NEXT_PUBLIC_ENABLE_AD_MOCK==='true',
  contentLive:false,
  rightLive:false,
  inPagePushLive:false,
  bottomLive:false,
  firstEntryLive:false,
} as const

/** Reserved deployment configuration; no external script is fetched by this build. */
export const bannerEnvironmentKeys={
  content:'STAYHUB_AD_LEFT_URL',
  right:'STAYHUB_AD_RIGHT_URL',
  bottom:'STAYHUB_AD_BOTTOM_URL',
} as const
