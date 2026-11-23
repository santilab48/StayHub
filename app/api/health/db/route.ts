import { NextResponse } from 'next/server'
import { postgresHealthQuery } from '../../../../lib/db/postgres'

export const dynamic = 'force-dynamic'

/** Read-only DB readiness. Never expose database host, credentials, or query errors. */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' }
  try {
    const res = await postgresHealthQuery<{ applied: number }>(
      `SELECT COUNT(*)::integer AS applied FROM stayhub.schema_migrations
       WHERE filename ~ '^0(0[1-9]|1[01])_[a-zA-Z0-9_-]+\\.sql$'`,
    )
    if (res.rows[0]?.applied !== 11) {
      return NextResponse.json({ status: 'unavailable' }, { status: 503, headers })
    }
    return NextResponse.json({ status: 'ok', service: 'stayhub', database: 'ready' }, { headers })
  } catch {
    return NextResponse.json({ status: 'unavailable' }, { status: 503, headers })
  }
}
