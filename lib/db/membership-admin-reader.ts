import 'server-only'
import {Pool} from 'pg'
import {membershipConfig} from './membership-neon'

// Shares the same independently scoped Neon reader credential, never a privileged writer.
// Kept separate to avoid exposing generic query APIs outside the server.
let reader:Pool|undefined
export function getNeonMembershipAdminReader():Pool{
  const config=membershipConfig()
  if(!config)throw new Error('Membership service not configured')
  if(!reader)reader=new Pool({connectionString:config.url,max:2,connectionTimeoutMillis:10000,
    application_name:'stayhub-platform-admin-readonly'})
  return reader
}
