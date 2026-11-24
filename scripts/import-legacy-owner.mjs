import pg from 'pg'

// Explicit, one-time operational recovery. Never use staging or membership DBs.
const env=process.env
const refuse=message=>{throw new Error(message)}
async function recover(){
  if(env.STAYHUB_IMPORT_LEGACY_OWNER!=='1')return
  if(env.RAILWAY_PROJECT_ID!=='a8a5a434-4d18-438f-b4ea-ece072094595' ||
     env.RAILWAY_ENVIRONMENT_ID!=='c9c4b13a-9041-4ae6-bd50-2d02b546b053' ||
     env.RAILWAY_ENVIRONMENT_NAME!=='production' ||
     env.STAYHUB_DB_PROVIDER!=='railway' || env.STAYHUB_DATABASE_ROLE!=='production')
    refuse('Incorrect recovery environment')
  const src=new URL(env.STAYHUB_NEON_PRODUCTION_URL||'')
  const dst=new URL(env.DATABASE_URL||'')
  if(!['postgres:','postgresql:'].includes(src.protocol)||
     src.hostname!==env.STAYHUB_NEON_PRODUCTION_HOST||
     !src.hostname.endsWith('.neon.tech')||src.pathname!=='/neondb'||
     decodeURIComponent(src.username)!=='neondb_owner'||
     !['postgres:','postgresql:'].includes(dst.protocol)||
     dst.hostname!=='postgres-pdqf.railway.internal'||dst.pathname!=='/railway')
    refuse('Incorrect recovery database identity')
  src.searchParams.set('sslmode','verify-full')
  const origin=new pg.Pool({connectionString:src.toString(),max:1,connectionTimeoutMillis:10000})
  const target=new pg.Pool({connectionString:dst.toString(),max:1,connectionTimeoutMillis:10000})
  try{
    const s=await origin.connect()
    let account,property,member,unit
    try{
      if(!s.connection.stream.encrypted||!s.connection.stream.authorized)refuse('Source TLS not verified')
      await s.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
      const identity=await s.query('SELECT current_database() AS db,current_user AS role')
      if(identity.rows[0].db!=='neondb'||identity.rows[0].role!=='neondb_owner')refuse('Source identity mismatch')
      const one=async sql=>{const r=await s.query(sql);if(r.rowCount!==1)refuse('Unexpected legacy source row count');return r.rows[0]}
      account=await one('SELECT id,email,created_at,password_hash,display_name FROM stayhub.accounts')
      property=await one('SELECT id,owner_account_id,name,property_type,billing_mode,timezone,currency,status,created_at FROM stayhub.properties')
      member=await one('SELECT property_id,account_id,role,created_at FROM stayhub.property_memberships')
      unit=await one('SELECT id,property_id,name,kind,capacity,active,created_at FROM stayhub.units')
      if(!/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/.test(account.password_hash||'')||
         property.owner_account_id!==account.id||member.account_id!==account.id||
         member.property_id!==property.id||member.role!=='owner'||unit.property_id!==property.id)
        refuse('Unexpected legacy owner relationship')
      await s.query('COMMIT')
    }catch(e){await s.query('ROLLBACK').catch(()=>{});throw e}
    finally{s.release()}
    const d=await target.connect()
    try{
      await d.query('BEGIN')
      await d.query('SELECT pg_advisory_xact_lock(832615021)')
      const identity=await d.query('SELECT current_database() AS db,(SELECT count(*)::int FROM stayhub.schema_migrations) AS migrations')
      if(identity.rows[0].db!=='railway'||identity.rows[0].migrations!==19)refuse('Target identity or migration mismatch')
      await d.query('LOCK TABLE stayhub.accounts, stayhub.properties, stayhub.property_memberships, stayhub.units IN SHARE ROW EXCLUSIVE MODE')
      const counts=(await d.query('SELECT (SELECT count(*)::int FROM stayhub.accounts) AS accounts,(SELECT count(*)::int FROM stayhub.properties) AS properties,(SELECT count(*)::int FROM stayhub.property_memberships) AS members,(SELECT count(*)::int FROM stayhub.units) AS units')).rows[0]
      if(Object.values(counts).some(n=>n!==0)){
        const prior=await d.query('SELECT 1 FROM stayhub.accounts a JOIN stayhub.properties p ON p.owner_account_id=a.id JOIN stayhub.property_memberships m ON m.account_id=a.id AND m.property_id=p.id AND m.role=$5 JOIN stayhub.units u ON u.property_id=p.id WHERE a.id=$1 AND lower(a.email)=lower($2) AND p.id=$3 AND u.id=$4',[account.id,account.email,property.id,unit.id,'owner'])
        if(prior.rowCount!==1)refuse('Target is not empty; refusing to overwrite or merge accounts')
        await d.query('COMMIT')
        console.log('PASS legacy owner recovery already present; no rows changed')
        return
      }
      await d.query('INSERT INTO stayhub.accounts(id,email,created_at,password_hash,display_name) VALUES($1,$2,$3,$4,$5)',[account.id,account.email,account.created_at,account.password_hash,account.display_name])
      await d.query('INSERT INTO stayhub.properties(id,owner_account_id,name,property_type,billing_mode,timezone,currency,status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[property.id,property.owner_account_id,property.name,property.property_type,property.billing_mode,property.timezone,property.currency,property.status,property.created_at])
      await d.query('INSERT INTO stayhub.property_memberships(property_id,account_id,role,created_at) VALUES($1,$2,$3,$4)',[member.property_id,member.account_id,member.role,member.created_at])
      await d.query('INSERT INTO stayhub.units(id,property_id,name,kind,capacity,active,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[unit.id,unit.property_id,unit.name,unit.kind,unit.capacity,unit.active,unit.created_at])
      const verified=await d.query('SELECT 1 FROM stayhub.accounts WHERE id=$1 AND password_hash=$2',[account.id,account.password_hash])
      if(verified.rowCount!==1)refuse('Account verification failed')
      await d.query('COMMIT')
      console.log('PASS legacy owner recovery: 1 account, 1 property, 1 owner membership, 1 unit; no sessions or invitations imported')
    }catch(e){await d.query('ROLLBACK').catch(()=>{});throw e}
    finally{d.release()}
  }finally{await Promise.allSettled([origin.end(),target.end()])}
}
try{await recover()}catch(e){
  // Never log database error details, connection strings, email or password hash.
  const allowed=['Incorrect recovery environment','Incorrect recovery database identity','Source TLS not verified','Source identity mismatch','Unexpected legacy source row count','Unexpected legacy owner relationship','Target identity or migration mismatch','Target is not empty; refusing to overwrite or merge accounts','Account verification failed']
  console.error('Legacy owner recovery refused:',allowed.includes(e?.message)?e.message:'database or connection error')
  process.exitCode=1
  throw new Error('Legacy owner recovery did not complete')
}
