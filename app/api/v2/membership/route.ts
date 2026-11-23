import { NextResponse } from 'next/server'
import { accountFromSession } from '../../../../lib/cloud-identity'
import { getMemberBenefits, membershipConfig } from '../../../../lib/db/membership-neon'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'no-store'}
export async function GET(){
  try {
    // Railway sessions remain the sole identity authority.
    const account=await accountFromSession()
    if(!account)return NextResponse.json({error:'Please sign in'},{status:401,headers})
    if(!membershipConfig())return NextResponse.json({error:'Membership service unavailable'},{status:503,headers})
    const membership=await getMemberBenefits(account.id)
    return NextResponse.json({membership},{headers})
  } catch {
    // Never expose database names, SQL errors, credentials or privileged grants.
    return NextResponse.json({error:'Membership service unavailable'},{status:503,headers})
  }
}
// Intentionally no POST/PATCH/DELETE: clients cannot grant or extend privileges.
