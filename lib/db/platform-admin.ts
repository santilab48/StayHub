import 'server-only'
import {getNeonMembershipAdminReader} from './membership-admin-reader'

// No Railway account gains platform administration from property roles, passwords,
// emails, subscription plans or client-supplied fields. Explicit Neon admin registry only.
export async function isPlatformAdmin(accountId:string):Promise<boolean>{
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(accountId))return false
  const pool=getNeonMembershipAdminReader()
  const r=await pool.query<{permitted:boolean}>(`
    SELECT EXISTS(
      SELECT 1 FROM stayhub_membership.platform_admins
      WHERE railway_account_id=$1 AND enabled=true AND revoked_at IS NULL
    ) AS permitted`,[accountId])
  return r.rows[0]?.permitted===true
}
