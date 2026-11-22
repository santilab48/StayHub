import { NextResponse } from 'next/server'
import { getPostgresPool } from '../../../../../lib/db/postgres'

export const dynamic = 'force-dynamic'

/** Staging-only transport probe. No host, database name or credential is returned. */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' }
  if (process.env.RAILWAY_PROJECT_ID !== 'a8a5a434-4d18-438f-b4ea-ece072094595' ||
      process.env.RAILWAY_ENVIRONMENT_ID !== 'ced39691-4fe7-4707-bba7-6d0e801f1ff8' ||
      process.env.RAILWAY_ENVIRONMENT_NAME !== 'staging' ||
      process.env.STAYHUB_DB_PROVIDER !== 'neon-staging') {
    return NextResponse.json({ status: 'unavailable' }, { status: 404, headers })
  }
  try {
    const client = await getPostgresPool().connect()
    let tls = false
    try {
      await client.query('SELECT 1')
      // Neon may terminate the client TLS at its pooler. pg_stat_ssl on the
      // backend then measures a different hop, so inspect the app's TLS socket.
      const stream = client.connection.stream as unknown as {
        encrypted?: boolean
        authorized?: boolean
      }
      tls = stream.encrypted === true && stream.authorized === true
    } finally {
      client.release()
    }
    return NextResponse.json({ status: tls ? 'ok' : 'insecure', tls },
      { status: tls ? 200 : 503, headers })
  } catch {
    return NextResponse.json({ status: 'unavailable' }, { status: 503, headers })
  }
}
