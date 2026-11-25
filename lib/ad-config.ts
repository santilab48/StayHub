export const adConfig={
  mock:process.env.NEXT_PUBLIC_ENABLE_AD_MOCK==='true',
  contentLive:process.env.NEXT_PUBLIC_ENABLE_CONTENT_AD_LIVE==='true',
  rightLive:process.env.NEXT_PUBLIC_ENABLE_RIGHT_AD_LIVE==='true',
  inPagePushLive:false,
  bottomLive:process.env.NEXT_PUBLIC_ENABLE_BOTTOM_AD_LIVE==='true',
  firstEntryLive:false,
} as const

// The three reviewed uploads are display banners. Never accept a URL from a
// tenant, a property, a query string or a network response.
export const bannerSources={
  // hta-code-7659305.txt — left Zone IDs 7659305–7659309
  content:'https://shameful-farm.com/bZXzVfs.d/GAlL0VYmWbco/ZeImT9su/ZzUFl/k_PXT/c/2yNdTLk/zHMZD/U/tHNYz_YT1fONTNMnw/OdQX',
  // hta-code-7659321.txt — right Zone IDs 7659321–7659325
  right:'https://shameful-farm.com/bGXcV/s.d/GGl/0RY/WHcL/zeSmP9DuZZ/U/lEkmPiTZc/2CN/TfkzzuM/jzEctRNSzjYM1hOMTcM/yRNDQm',
  // hta-code-7659337.txt — bottom Zone IDs 7659337–7659341
  bottom:'https://shameful-farm.com/bNXoVUsfd.GElN0/YBWRcs/Xe/mZ9Uu/ZWUtl/kPPOTmcw2/NcTokQzAM-z-cwtWNwzOYK1BOSTFMC0/MiQZ',
} as const

/** Reserved server-side names for future provider URL rotation. */
export const bannerEnvironmentKeys={
  content:'STAYHUB_AD_LEFT_URL',
  right:'STAYHUB_AD_RIGHT_URL',
  bottom:'STAYHUB_AD_BOTTOM_URL',
} as const
