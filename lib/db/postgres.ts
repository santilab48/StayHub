import 'server-only'
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg'

let pool: Pool | undefined

/** Server-only connection for the managed PostgreSQL instance on Railway. */
export function getPostgresPool(): Pool {
  // Opt-in staging-only Neon cutover. Keep Railway's DATABASE_URL intact for rollback.
  const usingNeonStaging = process.env.STAYHUB_DB_PROVIDER === 'neon-staging'
  const usingNeonProduction = process.env.STAYHUB_DB_PROVIDER === 'neon-production'
  const writeFreeze = process.env.STAYHUB_WRITE_FREEZE === 'YES'
  // Write freeze is a temporary maintenance state, not a permanent Neon
  // connection requirement. Production promotion/cutover remains a separate
  // operator-controlled release gate.
  if (usingNeonStaging && (
    process.env.RAILWAY_PROJECT_ID !== 'a8a5a434-4d18-438f-b4ea-ece072094595' ||
    process.env.RAILWAY_ENVIRONMENT_NAME !== 'staging' ||
    process.env.RAILWAY_ENVIRONMENT_ID !== 'ced39691-4fe7-4707-bba7-6d0e801f1ff8'
  )) throw new Error('Neon staging connection refused outside approved Railway staging')
  if (usingNeonProduction && (
    process.env.RAILWAY_PROJECT_ID !== 'a8a5a434-4d18-438f-b4ea-ece072094595' ||
    process.env.RAILWAY_ENVIRONMENT_NAME !== 'production' ||
    process.env.RAILWAY_ENVIRONMENT_ID !== 'c9c4b13a-9041-4ae6-bd50-2d02b546b053'
  )) throw new Error('Neon production connection refused outside approved Railway production')
  let connectionString = usingNeonStaging
    ? process.env.STAYHUB_NEON_STAGING_URL
    : process.env.DATABASE_URL
  if (!connectionString) throw new Error('PostgreSQL connection is not configured')
  if (usingNeonStaging || usingNeonProduction) {
    const url = new URL(connectionString)
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:')
      throw new Error('Neon URL must use PostgreSQL')
    if (!url.hostname.endsWith('.neon.tech')) throw new Error('Neon URL must point to Neon')
    if (usingNeonProduction && (
      !process.env.STAYHUB_NEON_PRODUCTION_HOST ||
      url.hostname !== process.env.STAYHUB_NEON_PRODUCTION_HOST ||
      url.pathname !== '/neondb'
    )) throw new Error('Neon production endpoint identity mismatch')
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
      // Defense in depth while cutover is frozen: all new application DB
      // sessions default to read-only, including unexpected GET-side writes.
      options: writeFreeze ? '-c default_transaction_read_only=on' : undefined,
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
