import 'server-only'
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg'

// One backend connection pool per Node process. Never expose DATABASE_URL to browser code.
let pool: Pool | undefined

export function getNeonPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set for StayHub server')
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      application_name: 'stayhub-web',
    })
  }
  return pool
}

export async function neonQuery<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  return getNeonPool().query<T>(sql, [...params])
}

/** A transaction must always use the same acquired connection. */
export async function withNeonTransaction<T>(
  handler: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getNeonPool().connect()
  try {
    await client.query('BEGIN')
    const value = await handler(client)
    await client.query('COMMIT')
    return value
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
