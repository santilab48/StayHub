export const adConfig={
  mock:process.env.NEXT_PUBLIC_ENABLE_AD_MOCK==='true',
  contentLive:process.env.NEXT_PUBLIC_ENABLE_CONTENT_AD_LIVE==='true',
  rightLive:process.env.NEXT_PUBLIC_ENABLE_RIGHT_AD_LIVE==='true',
  inPagePushLive:false,
  bottomLive:process.env.NEXT_PUBLIC_ENABLE_BOTTOM_AD_LIVE==='true',
  firstEntryLive:false,
} as const

export const defaultBannerHosts=['shameful-farm.com'] as const

export const adsenseClientId='ca-pub-6386708667648997'
export function validAdsenseSlot(raw:unknown):string|null{
  return typeof raw==='string'&&/^\d{10}$/.test(raw)?raw:null
}

/** Exact provider hosts configured by the operator; wildcards and IPs are refused. */
export function providerHosts(raw:unknown):string[]{
  if(raw===undefined||raw==='')return [...defaultBannerHosts]
  if(typeof raw!=='string'||raw.length>512)return []
  const hosts=raw.split(',').map(x=>x.trim().toLowerCase())
  if(hosts.length<1||hosts.length>8||hosts.some(x=>!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(x)))return []
  return [...new Set(hosts)]
}

// Zone scripts are configured by the staging service, never by a property or user.
export function validatedBannerUrl(raw:unknown,allowedHosts:readonly string[]=defaultBannerHosts):string|null{
  if(typeof raw!=='string'||raw.length>512)return null
  try{
    const u=new URL(raw)
    if(u.protocol!=='https:'||!allowedHosts.includes(u.hostname)||u.port||u.username||u.password||u.search||u.hash||u.pathname==='/')return null
    return u.href
  }catch{return null}
}

/** Reserved server-side names for future provider URL rotation. */
export const bannerEnvironmentKeys={
  content:'STAYHUB_AD_LEFT_URL',
  right:'STAYHUB_AD_RIGHT_URL',
  bottom:'STAYHUB_AD_BOTTOM_URL',
} as const
