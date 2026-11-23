import { NextResponse } from 'next/server'
import { getPostgresPool } from '../../../../../lib/db/postgres'

export const dynamic = 'force-dynamic'

/** Non-sensitive cutover freeze probe, scoped to the approved Railway project. */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' }
  if (
    process.env.RAILWAY_PROJECT_ID !== 'a8a5a434-4d18-438f-b4ea-ece072094595' ||
    !['production', 'staging'].includes(process.env.RAILWAY_ENVIRONMENT_NAME ?? '')
  ) return NextResponse.json({ status: 'unavailable' }, { status: 404, headers })

  if (process.env.STAYHUB_WRITE_FREEZE !== 'YES') {
    return NextResponse.json({ status: 'not_frozen', readOnly: false }, { status: 503, headers })
  }

  try {
    const client = await getPostgresPool().connect()
    try {
      await client.query('BEGIN READ ONLY')
      const state = await client.query<{ read_only: string }>('SHOW transaction_read_only')
      await client.query('COMMIT')
      const readOnly = state.rows[0]?.read_only === 'on'
      return NextResponse.json(
        { status: readOnly ? 'frozen' : 'unavailable', readOnly },
        { status: readOnly ? 200 : 503, headers },
      )
    } catch (error) {
      try { await client.query('ROLLBACK') } catch { /* Preserve probe failure. */ }
      throw error
    } finally { client.release() }
  } catch {
    return NextResponse.json({ status: 'unavailable' }, { status: 503, headers })
  }
}
