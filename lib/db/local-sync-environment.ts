import 'server-only'

/** Explicit Railway environment allowlist; never enable sync on unknown deployments. */
export function localSyncEnabled(): boolean {
  const env = process.env
  if (env.NODE_ENV !== 'production' && env.STAYHUB_LOCAL_SYNC_TEST === '1') return true
  if (env.RAILWAY_PROJECT_ID !== 'a8a5a434-4d18-438f-b4ea-ece072094595') return false
  if (env.RAILWAY_ENVIRONMENT_NAME === 'production' &&
      env.RAILWAY_ENVIRONMENT_ID === 'c9c4b13a-9041-4ae6-bd50-2d02b546b053') {
    return env.STAYHUB_DB_PROVIDER === 'railway' &&
      env.STAYHUB_LOCAL_SYNC_ENABLED === '1'
  }
  if (env.RAILWAY_ENVIRONMENT_NAME === 'staging' &&
      env.RAILWAY_ENVIRONMENT_ID === 'ced39691-4fe7-4707-bba7-6d0e801f1ff8') {
    return env.STAYHUB_DB_PROVIDER === 'neon-staging' ||
      env.STAYHUB_DB_PROVIDER === 'railway'
  }
  return false
}
