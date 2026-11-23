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
  const expectedMigrations = process.env.STAYHUB_DB_PROVIDER === 'neon-staging' ? 14 : 13
  if(r.rows[0]?.applied !== expectedMigrations)return NextResponse.json({status:'unavailable'},{status:503,headers})
  return NextResponse.json({status:'ok',service:'stayhub',database:'ready'},{headers})
 }catch{return NextResponse.json({status:'unavailable'},{status:503,headers})}
}
