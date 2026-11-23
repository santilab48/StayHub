import { NextResponse } from 'next/server'
import { accountFromSession } from '../../../../../lib/cloud-identity'
import { postgresQuery } from '../../../../../lib/db/postgres'
export const dynamic = 'force-dynamic'
export async function GET() {
  if (!(process.env.NODE_ENV !== 'production' && process.env.STAYHUB_LOCAL_SYNC_TEST === '1') &&
      (process.env.STAYHUB_DB_PROVIDER !== 'neon-staging' ||
      process.env.RAILWAY_ENVIRONMENT_NAME !== 'staging' ||
      process.env.RAILWAY_ENVIRONMENT_ID !== 'ced39691-4fe7-4707-bba7-6d0e801f1ff8')) return NextResponse.json({ error: 'Sync unavailable' }, { status: 503 })
  const account = await accountFromSession()
  if (!account) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  const result = await postgresQuery<{ id: string; name: string }>(`SELECT p.id,p.name FROM stayhub.properties p
    JOIN stayhub.property_memberships m ON m.property_id=p.id
    WHERE m.account_id=$1 AND m.role IN ('owner','admin') AND p.status<>'suspended'
    ORDER BY p.name`, [account.id])
  return NextResponse.json({ accountId: account.id, properties: result.rows }, { headers: { 'Cache-Control': 'no-store' } })
}
