import 'server-only'
import { Pool } from 'pg'

// Never reuse the Railway application pool for membership queries.
// In production, a Neon hostname and fixed DB identity are mandatory.
let pool: Pool | undefined
export function membershipConfig() {
  const raw=process.env.STAYHUB_MEMBERSHIP_DATABASE_URL
  if(!raw)return null
  const url=new URL(raw)
  if(!['postgres:','postgresql:'].includes(url.protocol))throw Error('Invalid membership database scheme')
  const ci=process.env.CI==='true' &&
    process.env.P26_E2E_BASE==='http://127.0.0.1:3000' &&
    url.hostname==='127.0.0.1' && url.pathname==='/stayhub_membership_ci' &&
    process.env.DATABASE_URL?.includes('127.0.0.1:5432/stayhub_p26_ci')===true
  if(!ci) {
    const expected=process.env.STAYHUB_MEMBERSHIP_NEON_HOST
    if(!expected || !expected.endsWith('.neon.tech') || url.hostname!==expected ||
       url.pathname!=='/neondb')throw Error('Membership Neon identity mismatch')
    url.searchParams.set('sslmode','verify-full')
  }
  return {url:url.toString(),ci}
}
function membershipPool() {
  const config=membershipConfig()
  if(!config)throw Error('Membership storage not configured')
  if(!pool)pool=new Pool({
    connectionString:config.url,max:3,
    connectionTimeoutMillis:10000,idleTimeoutMillis:30000,
    application_name:'stayhub-membership-readonly',
  })
  return pool
}
export type MembershipSnapshot={
  plan:string|null
  status:'trial'|'active'|'expired'|'suspended'|'cancelled'|'none'
  expiresAt:string|null
  entitlements:string[]
}
const NONE:MembershipSnapshot={plan:null,status:'none',expiresAt:null,entitlements:[]}
export async function getMemberBenefits(accountId:string):Promise<MembershipSnapshot>{
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(accountId))throw Error('Invalid account ID')
  if(!membershipConfig())throw Error('Membership unavailable')
  const result=await membershipPool().query<{
    plan_code:string;status:MembershipSnapshot['status'];ends_at:Date;eligible:boolean;entitlement:string|null
  }>(`SELECT m.plan_code,m.status,m.ends_at,
        (m.status IN ('active','trial') AND m.starts_at<=now() AND m.ends_at>now() AND p.active) AS eligible,
        pe.entitlement_code AS entitlement
      FROM stayhub_membership.memberships m
      JOIN stayhub_membership.plans p ON p.code=m.plan_code
      LEFT JOIN stayhub_membership.plan_entitlements pe ON pe.plan_code=p.code
      WHERE m.railway_account_id=$1`,[accountId])
  if(!result.rows.length)return {...NONE}
  const first=result.rows[0]
  const valid=first.eligible===true
  return {
    plan:first.plan_code,
    status:!valid && (first.status==='trial'||first.status==='active')?'expired':first.status,
    expiresAt:new Date(first.ends_at).toISOString(),
    entitlements:valid?[...new Set(result.rows.map(r=>r.entitlement).filter((x):x is string=>Boolean(x)))].sort():[],
  }
}
