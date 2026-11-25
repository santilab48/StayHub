export const adConfig={
  mock:process.env.NEXT_PUBLIC_ENABLE_AD_MOCK==='true',
  contentLive:process.env.NEXT_PUBLIC_ENABLE_CONTENT_AD_LIVE==='true',
  rightLive:process.env.NEXT_PUBLIC_ENABLE_RIGHT_AD_LIVE==='true',
  inPagePushLive:false,
  bottomLive:process.env.NEXT_PUBLIC_ENABLE_BOTTOM_AD_LIVE==='true',
  firstEntryLive:false,
} as const

// Only the provider host used in the reviewed Zone files is allowed. Zone
// scripts are configured by the staging service, never by a property or user.
export function validatedBannerUrl(raw:unknown):string|null{
  if(typeof raw!=='string'||raw.length>512)return null
  try{
    const u=new URL(raw)
    if(u.protocol!=='https:'||u.hostname!=='shameful-farm.com'||u.port||u.username||u.password||u.search||u.hash||u.pathname==='/')return null
    return u.href
  }catch{return null}
}

/** Reserved server-side names for future provider URL rotation. */
export const bannerEnvironmentKeys={
  content:'STAYHUB_AD_LEFT_URL',
  right:'STAYHUB_AD_RIGHT_URL',
  bottom:'STAYHUB_AD_BOTTOM_URL',
} as const
