import 'server-only'
import {createHash} from 'node:crypto'
import {postgresQuery} from './db/postgres'

// Database-backed, atomic per-account throttle. This is a first layer; edge/IP
// rate limiting, email verification and bot protection remain required for production.
export async function consumeAuthAttempt(
  scope:'login'|'register',
  normalizedEmail:string,
  limit:number,
  windowSeconds:number,
):Promise<boolean>{
  const key=createHash('sha256').update(scope+'\0'+normalizedEmail).digest('hex')
  const result=await postgresQuery(`
    INSERT INTO stayhub.auth_attempts(scope,identifier_hash,attempts,reset_at)
    VALUES($1,$2,1,now()+($4::integer * interval '1 second'))
    ON CONFLICT(scope,identifier_hash) DO UPDATE SET
      attempts=CASE WHEN stayhub.auth_attempts.reset_at<=now()
        THEN 1 ELSE stayhub.auth_attempts.attempts+1 END,
      reset_at=CASE WHEN stayhub.auth_attempts.reset_at<=now()
        THEN now()+($4::integer * interval '1 second')
        ELSE stayhub.auth_attempts.reset_at END
    WHERE stayhub.auth_attempts.reset_at<=now()
       OR stayhub.auth_attempts.attempts < $3
    RETURNING attempts
  `,[scope,key,limit,windowSeconds])
  return result.rowCount===1
}
export async function clearAuthAttempt(scope:'login'|'register',normalizedEmail:string){
  const key=createHash('sha256').update(scope+'\0'+normalizedEmail).digest('hex')
  await postgresQuery('DELETE FROM stayhub.auth_attempts WHERE scope=$1 AND identifier_hash=$2',[scope,key])
}
