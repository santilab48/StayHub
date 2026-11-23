import { NextResponse } from 'next/server'
import { accountFromSession } from '../../../../../lib/cloud-identity'
import { postgresQuery } from '../../../../../lib/db/postgres'
import { localSyncEnabled } from '../../../../../lib/db/local-sync-environment'
export const dynamic = 'force-dynamic'
export async function GET() {
  if (!localSyncEnabled()) return NextResponse.json({ error: 'Sync unavailable' }, { status: 503 })
  const account = await accountFromSession()
  if (!account) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  const result = await postgresQuery<{ id: string; name: string }>(`SELECT p.id,p.name FROM stayhub.properties p
    JOIN stayhub.property_memberships m ON m.property_id=p.id
    WHERE m.account_id=$1 AND m.role IN ('owner','admin') AND p.status<>'suspended'
    ORDER BY p.name`, [account.id])
  return NextResponse.json({ accountId: account.id, properties: result.rows }, { headers: { 'Cache-Control': 'no-store' } })
}
