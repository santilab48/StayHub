import {NextRequest,NextResponse} from 'next/server'
import {postgresQuery,withPostgresTransaction} from '../../../../lib/db/postgres'
import {accountFromSession,checkOrigin,hashPassword,hashToken,issueSession,newToken,stagingAuthEnabled,verifyPassword} from '../../../../lib/cloud-identity'
import QRCode from 'qrcode'
import {cookies} from 'next/headers'
import {consumeAuthAttempt,clearAuthAttempt} from '../../../../lib/auth-throttle'
import {ensureUnitCanAccept,endStay} from '../../../../lib/stay-lifecycle'

export const dynamic='force-dynamic'
type Params={params:Promise<{action:string}>}
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})
function validEmail(s:unknown){return typeof s==='string'&&s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)}
function validId(s:unknown):s is string{return typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)}
const roles=['owner','admin'] as const
function enabled(){return stagingAuthEnabled()}
async function ownerHasProperty(accountId:string,propertyId:string){
  const r=await postgresQuery(`SELECT 1 FROM stayhub.property_memberships WHERE account_id=$1 AND property_id=$2 AND role=ANY($3::text[])`,[accountId,propertyId,roles])
  return r.rowCount===1
}
export async function GET(req:NextRequest,{params}:Params){
  if(!enabled())return reply({error:'Cloud onboarding not enabled'},503)
  const {action}=await params
  try {
    if(action==='invite'){
      const token=req.nextUrl.searchParams.get('token')
      if(!token||token.length>128)return reply({error:'Invalid invitation'},400)
      const r=await postgresQuery<{name:string;property_type:string;unit_name:string|null}>(`
        SELECT p.name,p.property_type,u.name AS unit_name FROM stayhub.invites i
        JOIN stayhub.properties p ON p.id=i.property_id
        LEFT JOIN stayhub.units u ON u.id=i.unit_id AND u.property_id=i.property_id
        WHERE i.token_hash=$1 AND i.revoked_at IS NULL AND i.expires_at>now()
        AND i.use_count<i.max_uses AND p.status<>'suspended'`,[hashToken(token)])
      return r.rowCount?reply(r.rows[0]):reply({error:'Invitation expired or invalid'},404)
    }
    const account=await accountFromSession()
    if(!account)return reply({error:'Please sign in'},401)
    if(action==='me')return reply({id:account.id,email:account.email})
    if(action==='my-stays'){
      const r=await postgresQuery(`SELECT s.id,s.property_id,s.unit_id,p.name AS property_name,u.name AS unit_name,p.property_type
        FROM stayhub.stays s
        JOIN stayhub.properties p ON p.id=s.property_id
        JOIN stayhub.units u ON u.id=s.unit_id AND u.property_id=s.property_id
        WHERE s.account_id=$1 AND s.starts_at<=now()
        AND (s.ends_at IS NULL OR s.ends_at>now())
        ORDER BY s.starts_at DESC LIMIT 30`,[account.id])
      return reply({items:r.rows})
    }
    if(action==='properties'){
      const r=await postgresQuery(`SELECT p.id,p.name,p.property_type,p.billing_mode,m.role
        FROM stayhub.properties p JOIN stayhub.property_memberships m ON m.property_id=p.id
        WHERE m.account_id=$1 ORDER BY p.created_at DESC`,[account.id])
      return reply({items:r.rows})
    }
    if(action==='units'){
      const propertyId=req.nextUrl.searchParams.get('propertyId')
      if(!validId(propertyId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const r=await postgresQuery('SELECT id,name FROM stayhub.units WHERE property_id=$1 AND active=true ORDER BY name LIMIT 500',[propertyId])
      return reply({items:r.rows})
    }
    if(action==='invites'){
      const propertyId=req.nextUrl.searchParams.get('propertyId')
      if(!validId(propertyId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const r=await postgresQuery(`SELECT id,created_at,expires_at,use_count,max_uses,revoked_at,unit_id
        FROM stayhub.invites WHERE property_id=$1 ORDER BY created_at DESC LIMIT 100`,[propertyId])
      return reply({items:r.rows})
    }
    if(action==='my-requests'){
      const r=await postgresQuery(`SELECT r.id,r.status,r.created_at,p.name AS property_name,
        u.name AS unit_name FROM stayhub.join_requests r
        JOIN stayhub.properties p ON p.id=r.property_id
        LEFT JOIN stayhub.units u ON u.id=r.unit_id AND u.property_id=r.property_id
        WHERE r.account_id=$1 ORDER BY r.created_at DESC LIMIT 50`,[account.id])
      return reply({items:r.rows})
    }
    if(action==='occupancy'){
      const propertyId=req.nextUrl.searchParams.get('propertyId')
      if(!validId(propertyId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const r=await postgresQuery(`
        SELECT u.id,u.name,u.kind,u.capacity,u.active,
          (SELECT count(*)::integer FROM stayhub.stays st
           WHERE st.property_id=u.property_id AND st.unit_id=u.id
           AND st.starts_at<=now() AND (st.ends_at IS NULL OR st.ends_at>now())) AS occupants,
          EXISTS(SELECT 1 FROM stayhub.housekeeping_tasks h
           WHERE h.property_id=u.property_id AND h.unit_id=u.id
           AND h.status IN ('pending','in_progress')) AS cleaning,
          EXISTS(SELECT 1 FROM stayhub.unit_blocks b
           WHERE b.property_id=u.property_id AND b.unit_id=u.id
           AND b.starts_at<=now() AND b.ends_at>now()) AS blocked,
          EXISTS(SELECT 1 FROM stayhub.reservations r
           WHERE r.property_id=u.property_id AND r.unit_id=u.id
           AND r.status IN ('confirmed','checked_in')
           AND r.arrival_date<=CURRENT_DATE AND r.departure_date>CURRENT_DATE) AS reserved
        FROM stayhub.units u WHERE u.property_id=$1 ORDER BY u.name LIMIT 500
      `,[propertyId])
      return reply({items:r.rows})
    }
    if(action==='blocks'){
      const propertyId=req.nextUrl.searchParams.get('propertyId')
      if(!validId(propertyId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const r=await postgresQuery(`SELECT id,unit_id,starts_at,ends_at,reason
        FROM stayhub.unit_blocks WHERE property_id=$1 AND ends_at>now()
        ORDER BY ends_at ASC LIMIT 250`,[propertyId])
      return reply({items:r.rows})
    }
    if(action==='residents'){
      const propertyId=req.nextUrl.searchParams.get('propertyId')
      if(!validId(propertyId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const r=await postgresQuery(`
        SELECT st.id AS stay_id,st.account_id,st.unit_id,st.starts_at,st.ends_at,
          a.email,u.name AS unit_name
        FROM stayhub.stays st
        JOIN stayhub.accounts a ON a.id=st.account_id
        JOIN stayhub.units u ON u.id=st.unit_id AND u.property_id=st.property_id
        WHERE st.property_id=$1
        ORDER BY st.starts_at DESC LIMIT 500
      `,[propertyId])
      return reply({items:r.rows})
    }
    if(action==='requests'){
      const propertyId=req.nextUrl.searchParams.get('propertyId')
      if(!validId(propertyId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const r=await postgresQuery(`SELECT r.id,r.status,r.created_at,a.email,u.name AS unit_name
        FROM stayhub.join_requests r JOIN stayhub.accounts a ON a.id=r.account_id
        LEFT JOIN stayhub.units u ON u.id=r.unit_id AND u.property_id=r.property_id
        WHERE r.property_id=$1 ORDER BY r.created_at DESC LIMIT 100`,[propertyId])
      return reply({items:r.rows})
    }
    return reply({error:'Not found'},404)
  }catch {return reply({error:'Request unavailable'},503)}
}
export async function POST(req:NextRequest,{params}:Params){
  if(!enabled())return reply({error:'Cloud onboarding not enabled'},503)
  if(!checkOrigin(req))return reply({error:'Invalid request origin'},403)
  if(Number(req.headers.get('content-length')||0)>8192)return reply({error:'Payload too large'},413)
  const {action}=await params
  let body:Record<string,unknown>
  try{body=await req.json();if(!body||Array.isArray(body)||typeof body!=='object')throw Error('bad')}
  catch{return reply({error:'Invalid JSON'},400)}
  try {
    if(action==='register'){
      const email=typeof body.email==='string'?body.email.trim().toLowerCase():''
      const password=body.password
      if(!validEmail(email)||typeof password!=='string'||password.length<12||password.length>128)return reply({error:'Provide valid email and a password of 12–128 characters'},400)
      if(!await consumeAuthAttempt('register',email,3,3600))return reply({error:'Too many registration attempts. Please try again later'},429)
      const stored=await hashPassword(password)
      let id:string
      try{
        const r=await postgresQuery<{id:string}>('INSERT INTO stayhub.accounts(email,password_hash) VALUES($1,$2) RETURNING id',[email,stored])
        id=r.rows[0].id
      }catch(error){
        if((error as {code?:string}).code==='23505')return reply({error:'Registration unavailable or email already registered'},409)
        throw error
      }
      await issueSession(id)
      return reply({ok:true},201)
    }
    if(action==='login'){
      const email=typeof body.email==='string'?body.email.trim().toLowerCase():''
      if(!validEmail(email)||typeof body.password!=='string')return reply({error:'Invalid credentials'},401)
      if(!await consumeAuthAttempt('login',email,8,900))return reply({error:'Too many login attempts. Try again later'},429)
      const r=await postgresQuery<{id:string;password_hash:string|null}>('SELECT id,password_hash FROM stayhub.accounts WHERE lower(email)=$1',[email])
      if(!r.rowCount||!r.rows[0].password_hash||!await verifyPassword(body.password,r.rows[0].password_hash))return reply({error:'Invalid credentials'},401)
      await clearAuthAttempt('login',email)
      await issueSession(r.rows[0].id)
      return reply({ok:true})
    }
    if(action==='logout'){
      const jar=await cookies()
      const raw=jar.get('stayhub_session')?.value
      if(raw)await postgresQuery('UPDATE stayhub.sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL',[hashToken(raw)])
      jar.delete('stayhub_session')
      return reply({ok:true})
    }
    const account=await accountFromSession()
    if(!account)return reply({error:'Please sign in'},401)
    if(action==='property'){
      const name=typeof body.name==='string'?body.name.trim():''
      const type=body.type
      if(!name||name.length>120||!['apartment','guesthouse','daily','homestay'].includes(String(type)))return reply({error:'Invalid property'},400)
      const id=await withPostgresTransaction(async c=>{
        const r=await c.query<{id:string}>(`INSERT INTO stayhub.properties(owner_account_id,name,property_type) VALUES($1,$2,$3) RETURNING id`,[account.id,name,type])
        await c.query(`INSERT INTO stayhub.property_memberships(property_id,account_id,role) VALUES($1,$2,'owner')`,[r.rows[0].id,account.id])
        return r.rows[0].id
      })
      return reply({id},201)
    }
    const propertyId=body.propertyId
    if(action==='unit'){
      if(!validId(propertyId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const name=typeof body.name==='string'?body.name.trim():''
      if(!name||name.length>80)return reply({error:'Invalid unit name'},400)
      const r=await postgresQuery<{id:string}>('INSERT INTO stayhub.units(property_id,name) VALUES($1,$2) RETURNING id',[propertyId,name])
      return reply({id:r.rows[0].id},201)
    }
    if(action==='create-invite'){
      if(!validId(propertyId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const unitId=body.unitId
      if(unitId!==undefined&&unitId!==null){
        if(!validId(unitId))return reply({error:'Invalid unit'},400)
        const u=await postgresQuery('SELECT 1 FROM stayhub.units WHERE id=$1 AND property_id=$2 AND active=true',[unitId,propertyId])
        if(!u.rowCount)return reply({error:'Unit outside property'},403)
      }
      const raw=newToken()
      const created=await withPostgresTransaction(async client=>{
        // Cap outstanding invitations per property, using a property row lock.
        await client.query('SELECT id FROM stayhub.properties WHERE id=$1 FOR UPDATE',[propertyId])
        const count=await client.query(`SELECT count(*)::integer AS n FROM stayhub.invites
          WHERE property_id=$1 AND revoked_at IS NULL AND expires_at>now()
          AND use_count<max_uses`,[propertyId])
        if(count.rows[0].n>=20)return null
        const r=await client.query<{id:string}>(`INSERT INTO stayhub.invites(property_id,created_by,token_hash,unit_id,expires_at,max_uses)
          VALUES($1,$2,$3,$4,now()+interval '7 days',100) RETURNING id`,
          [propertyId,account.id,hashToken(raw),unitId||null])
        return r.rows[0].id
      })
      if(!created)return reply({error:'Too many active invitations; revoke an unused QR first'},409)
      const url=new URL('/join',req.nextUrl.origin)
      url.searchParams.set('token',raw)
      return reply({id:created,url:url.toString(),svg:await QRCode.toString(url.toString(),{type:'svg',margin:2,width:260})},201)
    }
    if(action==='revoke-invite'){
      if(!validId(propertyId)||!validId(body.inviteId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const r=await postgresQuery(`UPDATE stayhub.invites SET revoked_at=now()
        WHERE id=$1 AND property_id=$2 AND revoked_at IS NULL RETURNING id`,
        [body.inviteId,propertyId])
      return r.rowCount?reply({status:'revoked'}):reply({error:'Invite not found or already revoked'},404)
    }
    if(action==='reject'){
      if(!validId(propertyId)||!validId(body.requestId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const r=await postgresQuery(`UPDATE stayhub.join_requests
        SET status='rejected',reviewed_by=$1,reviewed_at=now()
        WHERE id=$2 AND property_id=$3 AND status='pending' RETURNING id`,
        [account.id,body.requestId,propertyId])
      return r.rowCount?reply({status:'rejected'}):reply({error:'Request not pending'},409)
    }
    if(action==='join'){
      const token=body.token
      if(typeof token!=='string'||token.length>128)return reply({error:'Invalid invitation'},400)
      const result=await withPostgresTransaction(async client=>{
        const r=await client.query<{id:string;property_id:string;unit_id:string|null;created_by:string}>(`
          SELECT i.id,i.property_id,i.unit_id,i.created_by FROM stayhub.invites i
          JOIN stayhub.properties p ON p.id=i.property_id
          WHERE i.token_hash=$1 AND i.revoked_at IS NULL AND i.expires_at>now()
          AND i.use_count<i.max_uses AND p.status<>'suspended'
          FOR UPDATE OF i`,[hashToken(token)])
        if(!r.rowCount)return 'invalid'
        const item=r.rows[0]
        const owner=await client.query('SELECT 1 FROM stayhub.property_memberships WHERE account_id=$1 AND property_id=$2 AND role=ANY($3::text[])',[account.id,item.property_id,roles])
        if(owner.rowCount)return 'owner'
        const existing=await client.query("SELECT id FROM stayhub.join_requests WHERE property_id=$1 AND account_id=$2 AND status='pending'",[item.property_id,account.id])
        if(existing.rowCount)return 'existing'
        const active=await client.query(`SELECT 1 FROM stayhub.stays
          WHERE property_id=$1 AND account_id=$2 AND starts_at<=now()
          AND (ends_at IS NULL OR ends_at>now()) LIMIT 1`,[item.property_id,account.id])
        if(active.rowCount)return 'already_resident'
        await client.query('INSERT INTO stayhub.join_requests(invite_id,property_id,account_id,unit_id) VALUES($1,$2,$3,$4)',[item.id,item.property_id,account.id,item.unit_id])
        await client.query('UPDATE stayhub.invites SET use_count=use_count+1 WHERE id=$1',[item.id])
        return 'pending'
      })
      return result==='pending'?reply({status:'pending'},201):reply({error:result},400)
    }
    if(action==='transfer'){
      if(!validId(propertyId)||!validId(body.stayId)||!validId(body.unitId)||
         !await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const targetUnitId=body.unitId as string
      const result=await withPostgresTransaction(async client=>{
        const existing=await client.query<{id:string;account_id:string;unit_id:string}>(`
          SELECT id,account_id,unit_id FROM stayhub.stays
          WHERE id=$1 AND property_id=$2 AND starts_at<=now()
            AND (ends_at IS NULL OR ends_at>now()) FOR UPDATE`,[body.stayId,propertyId])
        if(!existing.rowCount)return {status:'not_active'}
        const previous=existing.rows[0]
        const linked=await client.query('SELECT reservation_id FROM stayhub.stays WHERE property_id=$1 AND id=$2',[propertyId,previous.id])
        if(linked.rows[0]?.reservation_id)return {status:'use_reservation_checkout'}
        const lease=await client.query("SELECT 1 FROM stayhub.leases WHERE property_id=$1 AND stay_id=$2 AND status='active' LIMIT 1",[propertyId,previous.id])
        if(lease.rowCount)return {status:'terminate_lease_first'}
        if(previous.unit_id===targetUnitId)return {status:'same_unit'}
        const availability=await ensureUnitCanAccept(client,propertyId,targetUnitId)
        if(availability!=='ok')return {status:availability}
        await client.query('UPDATE stayhub.stays SET ends_at=now() WHERE id=$1',[previous.id])
        const next=await client.query<{id:string}>(`
          INSERT INTO stayhub.stays(property_id,unit_id,account_id)
          VALUES($1,$2,$3) RETURNING id`,[propertyId,targetUnitId,previous.account_id])
        await client.query(`INSERT INTO stayhub.stay_events
          (property_id,stay_id,account_id,actor_account_id,event_type,from_unit_id,to_unit_id)
          VALUES($1,$2,$3,$4,'transferred',$5,$6)`,
          [propertyId,next.rows[0].id,previous.account_id,account.id,previous.unit_id,targetUnitId])
        const remaining=await client.query(`SELECT 1 FROM stayhub.stays
          WHERE property_id=$1 AND unit_id=$2 AND starts_at<=now()
            AND (ends_at IS NULL OR ends_at>now()) LIMIT 1`,[propertyId,previous.unit_id])
        if(!remaining.rowCount){
          await client.query(`INSERT INTO stayhub.housekeeping_tasks(property_id,unit_id,triggered_by_stay_id)
            VALUES($1,$2,$3)
            ON CONFLICT (property_id,unit_id) WHERE status IN ('pending','in_progress') DO NOTHING`,
            [propertyId,previous.unit_id,previous.id])
        }
        return {status:'transferred',newStayId:next.rows[0].id}
      })
      return result.status==='transferred'?reply(result):reply({error:result.status},409)
    }
    if(action==='checkout'){
      if(!validId(propertyId)||!validId(body.stayId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const result=await withPostgresTransaction(async client=>{
        const reservation=await client.query('SELECT reservation_id FROM stayhub.stays WHERE property_id=$1 AND id=$2',[propertyId,body.stayId])
        if(reservation.rows[0]?.reservation_id)return 'use_reservation_checkout'
        const lease=await client.query("SELECT 1 FROM stayhub.leases WHERE property_id=$1 AND stay_id=$2 AND status='active' LIMIT 1",[propertyId,body.stayId])
        if(lease.rowCount)return 'terminate_lease_first'
        const previous=await endStay(client,propertyId,body.stayId as string,account.id)
        return previous?'checked_out':'not_active'
      })
      return result==='checked_out'?reply({status:result}):reply({error:result},409)
    }
    if(action==='block-room'){
      if(!validId(propertyId)||!validId(body.unitId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const reason=body.reason
      const until=body.endsAt
      if(!['maintenance','owner_hold','other'].includes(String(reason))||
         typeof until!=='string'||until.length>48||!Number.isFinite(Date.parse(until)))
        return reply({error:'Invalid block reason or end date'},400)
      const end=new Date(until)
      if(end.getTime()<=Date.now()||end.getTime()>Date.now()+90*86400_000)
        return reply({error:'Block must end within the next 90 days'},400)
      const status=await withPostgresTransaction(async client=>{
        const unit=await client.query(`SELECT id FROM stayhub.units
          WHERE id=$1 AND property_id=$2 AND active=true FOR UPDATE`,[body.unitId,propertyId])
        if(!unit.rowCount)return 'invalid_unit'
        const occupied=await client.query(`SELECT 1 FROM stayhub.stays
          WHERE property_id=$1 AND unit_id=$2 AND starts_at<=now()
          AND (ends_at IS NULL OR ends_at>now()) LIMIT 1`,[propertyId,body.unitId])
        if(occupied.rowCount)return 'occupied'
        const booked=await client.query(`SELECT 1 FROM stayhub.reservations
          WHERE property_id=$1 AND unit_id=$2 AND status IN ('confirmed','checked_in')
          AND arrival_date<$3::date AND departure_date>=CURRENT_DATE LIMIT 1`,
          [propertyId,body.unitId,end.toISOString()])
        if(booked.rowCount)return 'reserved'
        await client.query(`INSERT INTO stayhub.unit_blocks
          (property_id,unit_id,starts_at,ends_at,reason,created_by)
          VALUES($1,$2,now(),$3,$4,$5)`,[propertyId,body.unitId,end.toISOString(),reason,account.id])
        return 'blocked'
      })
      return status==='blocked'?reply({status}):reply({error:status},409)
    }
    if(action==='unblock-room'){
      if(!validId(propertyId)||!validId(body.blockId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const r=await postgresQuery(`UPDATE stayhub.unit_blocks
        SET ends_at=now()
        WHERE id=$1 AND property_id=$2 AND ends_at>now() RETURNING id`,
        [body.blockId,propertyId])
      return r.rowCount?reply({status:'unblocked'}):reply({error:'Block not found'},404)
    }
    if(action==='room-ready'){
      if(!validId(propertyId)||!validId(body.unitId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const r=await postgresQuery(`UPDATE stayhub.housekeeping_tasks SET status='ready',completed_at=now()
        WHERE property_id=$1 AND unit_id=$2 AND status IN ('pending','in_progress')
        RETURNING id`,[propertyId,body.unitId])
      return r.rowCount?reply({status:'ready'}):reply({error:'No active cleaning task'},409)
    }
    if(action==='approve'){
      if(!validId(propertyId)||!validId(body.requestId)||!validId(body.unitId)||!await ownerHasProperty(account.id,propertyId))return reply({error:'Forbidden'},403)
      const result=await withPostgresTransaction(async client=>{
        const r=await client.query<{account_id:string;status:string}>(`SELECT account_id,status FROM stayhub.join_requests
          WHERE id=$1 AND property_id=$2 FOR UPDATE`,[body.requestId,propertyId])
        if(!r.rowCount||r.rows[0].status!=='pending')return 'not_pending'
        const availability=await ensureUnitCanAccept(client,propertyId,body.unitId as string)
        if(availability!=='ok')return availability
        const membership=await client.query('SELECT role FROM stayhub.property_memberships WHERE property_id=$1 AND account_id=$2',[propertyId,r.rows[0].account_id])
        if(membership.rows.some(row=>!['resident','guest'].includes(row.role)))return 'reserved_role'
        await client.query(`INSERT INTO stayhub.stays(property_id,unit_id,account_id,join_request_id)
          VALUES($1,$2,$3,$4)`,[propertyId,body.unitId,r.rows[0].account_id,body.requestId])
        await client.query(`INSERT INTO stayhub.property_memberships(property_id,account_id,role)
          VALUES($1,$2,'resident') ON CONFLICT(property_id,account_id) DO UPDATE SET role='resident'
          WHERE stayhub.property_memberships.role IN ('resident','guest')`,[propertyId,r.rows[0].account_id])
        await client.query(`UPDATE stayhub.join_requests SET status='approved',reviewed_by=$1,reviewed_at=now(),unit_id=$2 WHERE id=$3`,[account.id,body.unitId,body.requestId])
        const newStay=await client.query('SELECT id FROM stayhub.stays WHERE join_request_id=$1',[body.requestId])
        await client.query(`INSERT INTO stayhub.stay_events(property_id,stay_id,account_id,actor_account_id,event_type,to_unit_id)
          VALUES($1,$2,$3,$4,'approved',$5)`,[propertyId,newStay.rows[0].id,r.rows[0].account_id,account.id,body.unitId])
        return 'approved'
      })
      return result==='approved'?reply({status:'approved'}):reply({error:result},409)
    }
    return reply({error:'Not found'},404)
  }catch{return reply({error:'Operation unavailable'},503)}
}
