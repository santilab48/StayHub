import {NextResponse} from 'next/server'
import {postgresHealthQuery} from '../../../../lib/db/postgres'
export const dynamic='force-dynamic'
// Read-only readiness: do not expose transport, host, or credentials to callers.
export async function GET(){
 const headers={'Cache-Control':'no-store'}
 try{
  const r=await postgresHealthQuery<{applied:number}>(
   'SELECT count(*)::integer AS applied FROM stayhub.schema_migrations'
  )
  // The isolated CI database deliberately applies every reviewed migration.
  // Never treat an arbitrary external DATABASE_URL as the CI fixture.
  const ciUrl = process.env.CI === 'true' && process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL)
    : null
  const isIsolatedCI = ciUrl?.hostname === '127.0.0.1' && ciUrl.pathname === '/stayhub_p26_ci'
  const expectedMigrations = process.env.STAYHUB_DB_PROVIDER === 'neon-production' ? 13
    : process.env.RAILWAY_ENVIRONMENT_NAME === 'production' && !isIsolatedCI ? 19 : 21
  if(r.rows[0]?.applied !== expectedMigrations)return NextResponse.json({status:'unavailable'},{status:503,headers})
  return NextResponse.json({status:'ok',service:'stayhub',database:'ready'},{headers})
 }catch{return NextResponse.json({status:'unavailable'},{status:503,headers})}
}
