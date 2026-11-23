import {NextRequest,NextResponse} from 'next/server'
import {accountFromSession} from '../../../../lib/cloud-identity'
import {isPlatformAdmin} from '../../../../lib/db/platform-admin'
import {getNeonMembershipAdminReader} from '../../../../lib/db/membership-admin-reader'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'no-store'}
const answer=(body:unknown,status=200)=>NextResponse.json(body,{status,headers})

/** Read-only, server-authorized membership directory. No privilege grant endpoints. */
export async function GET(req:NextRequest){
  try{
    const account=await accountFromSession()
    if(!account)return answer({error:'Sign-in required'},401)
    if(!await isPlatformAdmin(account.id))return answer({error:'Forbidden'},403)
    const url=new URL(req.url)
    const term=(url.searchParams.get('q')||'').trim().toLowerCase()
    if(term.length>80)return answer({error:'Invalid search'},400)
    const requested=Number(url.searchParams.get('limit')||'25')
    const limit=Number.isSafeInteger(requested)?Math.max(1,Math.min(50,requested)):25
    const offset=Number(url.searchParams.get('offset')||'0')
    if(!Number.isSafeInteger(offset)||offset<0||offset>100000)return answer({error:'Invalid pagination'},400)
    const r=await getNeonMembershipAdminReader().query<{
      railway_account_id:string;plan_code:string;status:string;starts_at:Date;ends_at:Date;version:string
    }>(`SELECT railway_account_id,plan_code,status,starts_at,ends_at,version::text
      FROM stayhub_membership.memberships
      WHERE ($1::text='' OR railway_account_id::text ILIKE '%'||$1||'%' OR plan_code ILIKE '%'||$1||'%')
      ORDER BY updated_at DESC,railway_account_id
      LIMIT $2 OFFSET $3`,[term,limit,offset])
    return answer({items:r.rows.map(x=>({...x,starts_at:new Date(x.starts_at).toISOString(),
      ends_at:new Date(x.ends_at).toISOString()})),limit,offset})
  }catch{return answer({error:'Platform directory unavailable'},503)}
}
// No POST, PATCH or DELETE — writes require privileged audited operator workflow.
