import 'server-only'
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg'

let pool: Pool | undefined

/** Server-only connection for the managed PostgreSQL instance on Railway. */
export function getPostgresPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not configured')
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

export function postgresQuery<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  return getPostgresPool().query<T>(sql, [...params])
}

export async function withPostgresTransaction<T>(
  handler: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPostgresPool().connect()
  let inTransaction = false
  try {
    await client.query('BEGIN')
    inTransaction = true
    const value = await handler(client)
    await client.query('COMMIT')
    inTransaction = false
    return value
  } catch (error) {
    if (inTransaction) {
      try { await client.query('ROLLBACK') } catch { /* Preserve original error. */ }
    }
    throw error
  } finally { client.release() }
}
