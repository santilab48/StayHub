import 'server-only'
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg'

let pool: Pool | undefined

/** Server-only connection for the managed PostgreSQL instance on Railway. */
export function getPostgresPool(): Pool {
  // Opt-in staging-only Neon cutover. Keep Railway's DATABASE_URL intact for rollback.
  const usingNeonStaging = process.env.STAYHUB_DB_PROVIDER === 'neon-staging'
  if (usingNeonStaging && (
    process.env.RAILWAY_PROJECT_ID !== 'a8a5a434-4d18-438f-b4ea-ece072094595' ||
    process.env.RAILWAY_ENVIRONMENT_NAME !== 'staging' ||
    process.env.RAILWAY_ENVIRONMENT_ID !== 'ced39691-4fe7-4707-bba7-6d0e801f1ff8'
  )) throw new Error('Neon staging connection refused outside approved Railway staging')
  let connectionString = usingNeonStaging
    ? process.env.STAYHUB_NEON_STAGING_URL
    : process.env.DATABASE_URL
  if (!connectionString) throw new Error('PostgreSQL connection is not configured')
  if (usingNeonStaging) {
    const url = new URL(connectionString)
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:')
      throw new Error('Neon staging URL must use PostgreSQL')
    if (!url.hostname.endsWith('.neon.tech')) throw new Error('Neon staging URL must point to Neon')
    // pg parses URL SSL options after Pool options. Require certificate and hostname
    // verification here even if a stored connection URL has sslmode=disable.
    url.searchParams.set('sslmode', 'verify-full')
    connectionString = url.toString()
  }
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
