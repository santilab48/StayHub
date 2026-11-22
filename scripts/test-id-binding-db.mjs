#!/usr/bin/env node
// Transaction-only PostgreSQL isolation checks. No test rows persist.
import {randomUUID,randomBytes} from 'node:crypto'
import pg from 'pg'
const env=process.env
if(env.RAILWAY_ENVIRONMENT_NAME!=='staging' ||
   env.RAILWAY_PROJECT_ID!=='a8a5a434-4d18-438f-b4ea-ece072094595' ||
   env.RAILWAY_ENVIRONMENT_ID!=='ced39691-4fe7-4707-bba7-6d0e801f1ff8' ||
   !env.DATABASE_URL) throw Error('REFUSED: must run against authorized StayHub staging')
const pool=new pg.Pool({connectionString:env.DATABASE_URL,max:1,connectionTimeoutMillis:10000})
const c=await pool.connect()
const email=(prefix)=>prefix+'+'+randomUUID()+'@example.invalid'
async function expectConstraint(label,run,code='23503'){
  await c.query('SAVEPOINT tenant_isolation_case')
  let rejected=false
  try{await run()}catch(e){if(e.code===code)rejected=true;else throw e}
  await c.query('ROLLBACK TO SAVEPOINT tenant_isolation_case')
  await c.query('RELEASE SAVEPOINT tenant_isolation_case')
  if(!rejected)throw Error('Tenant isolation failed: '+label)
  console.log('PASS',label)
}
try{
  await c.query('BEGIN')
  const ownerA=(await c.query("INSERT INTO stayhub.accounts(email) VALUES($1) RETURNING id",[email('owner-a')])).rows[0].id
  const ownerB=(await c.query("INSERT INTO stayhub.accounts(email) VALUES($1) RETURNING id",[email('owner-b')])).rows[0].id
  const tenant=(await c.query("INSERT INTO stayhub.accounts(email) VALUES($1) RETURNING id",[email('tenant')])).rows[0].id
  const a=(await c.query("INSERT INTO stayhub.properties(owner_account_id,name,property_type) VALUES($1,'Isolation A','apartment') RETURNING id",[ownerA])).rows[0].id
  const b=(await c.query("INSERT INTO stayhub.properties(owner_account_id,name,property_type) VALUES($1,'Isolation B','homestay') RETURNING id",[ownerB])).rows[0].id
  const unitA=(await c.query("INSERT INTO stayhub.units(property_id,name) VALUES($1,'Test A') RETURNING id",[a])).rows[0].id
  const unitB=(await c.query("INSERT INTO stayhub.units(property_id,name) VALUES($1,'Test B') RETURNING id",[b])).rows[0].id
  const invite=(await c.query("INSERT INTO stayhub.invites(property_id,created_by,token_hash,unit_id,expires_at) VALUES($1,$2,$3,$4,now()+interval '1 day') RETURNING id",[a,ownerA,randomBytes(32).toString('hex'),unitA])).rows[0].id
  await expectConstraint('Invitation cannot bind to other property',()=>c.query("INSERT INTO stayhub.join_requests(invite_id,property_id,account_id) VALUES($1,$2,$3)",[invite,b,tenant]))
  const request=(await c.query('INSERT INTO stayhub.join_requests(invite_id,property_id,account_id,unit_id) VALUES($1,$2,$3,$4) RETURNING id',[invite,a,tenant,unitA])).rows[0].id
  await expectConstraint('Stay cannot use a room from other property',()=>c.query('INSERT INTO stayhub.stays(property_id,unit_id,account_id,join_request_id) VALUES($1,$2,$3,$4)',[a,unitB,tenant,request]))
  await expectConstraint('Stay cannot impersonate another account from the same request',()=>c.query('INSERT INTO stayhub.stays(property_id,unit_id,account_id,join_request_id) VALUES($1,$2,$3,$4)',[a,unitA,ownerB,request]))
  await expectConstraint('Stay cannot use join request from other property',()=>c.query('INSERT INTO stayhub.stays(property_id,unit_id,account_id,join_request_id) VALUES($1,$2,$3,$4)',[b,unitB,tenant,request]))
  const stay=(await c.query('INSERT INTO stayhub.stays(property_id,unit_id,account_id,join_request_id) VALUES($1,$2,$3,$4) RETURNING id',[a,unitA,tenant,request])).rows[0].id
  const lease=(await c.query(`INSERT INTO stayhub.leases
    (property_id,stay_id,account_id,unit_id,starts_on,monthly_rent,created_by)
    VALUES($1,$2,$3,$4,'2026-11-22',8000,$5) RETURNING id`,
    [a,stay,tenant,unitA,ownerA])).rows[0].id
  await expectConstraint('Lease cannot impersonate another account',()=>c.query(`INSERT INTO stayhub.leases
    (property_id,stay_id,account_id,unit_id,starts_on,monthly_rent,created_by)
    VALUES($1,$2,$3,$4,'2026-11-22',8000,$5)`,[a,stay,ownerB,unitA,ownerA]))
  await expectConstraint('Lease cannot reference a room from another property',()=>c.query(`INSERT INTO stayhub.leases
    (property_id,stay_id,account_id,unit_id,starts_on,monthly_rent,created_by)
    VALUES($1,$2,$3,$4,'2026-11-22',8000,$5)`,[a,stay,tenant,unitB,ownerA]))
  await c.query("UPDATE stayhub.leases SET status='terminated',terminated_at=now() WHERE id=$1",[lease])
  console.log('PASS Lease terminated independently of stay')
  await expectConstraint('Housekeeping stay cannot belong to another property',
    ()=>c.query("INSERT INTO stayhub.housekeeping_tasks(property_id,unit_id,triggered_by_stay_id) VALUES($1,$2,$3)",[b,unitB,stay]))
  await expectConstraint('Stay audit cannot link another property',
    ()=>c.query("INSERT INTO stayhub.stay_events(property_id,stay_id,account_id,actor_account_id,event_type) VALUES($1,$2,$3,$4,'approved')",[b,stay,tenant,ownerB]))
  await expectConstraint('Unit block cannot reference another property',
    ()=>c.query("INSERT INTO stayhub.unit_blocks(property_id,unit_id,starts_at,ends_at,reason,created_by) VALUES($1,$2,now(),now()+interval '1 day','maintenance',$3)",[b,unitA,ownerB]))
  await c.query('UPDATE stayhub.stays SET ends_at=now() WHERE id=$1',[stay])
  const activeAfter=(await c.query("SELECT count(*)::integer AS n FROM stayhub.stays WHERE property_id=$1 AND account_id=$2 AND ends_at IS NULL",[a,tenant])).rows[0].n
  if(activeAfter!==0)throw Error('Checkout did not end old active stay')
  console.log('PASS Checkout ends authorized active stay')
  await c.query("INSERT INTO stayhub.housekeeping_tasks(property_id,unit_id,triggered_by_stay_id) VALUES($1,$2,$3)",[a,unitA,stay])
  const pending=(await c.query("SELECT count(*)::integer AS n FROM stayhub.housekeeping_tasks WHERE property_id=$1 AND unit_id=$2 AND status='pending'",[a,unitA])).rows[0].n
  if(pending!==1)throw Error('Checkout did not leave room in housekeeping queue')
  console.log('PASS Checkout housekeeping queue is scoped to property and room')
  const before=await c.query('SELECT 1 FROM stayhub.property_memberships WHERE property_id=$1 AND account_id=$2',[a,tenant])
  if(before.rowCount)throw Error('QR join request unexpectedly gave tenant membership')
  console.log('PASS Pending QR join does not grant membership')
  await c.query("INSERT INTO stayhub.reservations(property_id,unit_id,arrival_date,departure_date,status) VALUES($1,$2,'2027-01-01','2027-01-04','confirmed')",[a,unitA])
  await expectConstraint('Active reservations cannot overlap',()=>c.query("INSERT INTO stayhub.reservations(property_id,unit_id,arrival_date,departure_date,status) VALUES($1,$2,'2027-01-03','2027-01-05','confirmed')",[a,unitA]),'23P01')
  await c.query('ROLLBACK')
  console.log('All staging database ID-binding checks passed; all temporary data rolled back.')
}catch(e){
  try{await c.query('ROLLBACK')}catch{}
  throw e
}finally{c.release();await pool.end()}
