import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { accountFromSession, checkOrigin } from '../../../../lib/cloud-identity'
import { withPostgresTransaction } from '../../../../lib/db/postgres'
import { canManageProperty, uuid } from '../../../../lib/db/billing-request'
import { localSyncEnabled } from '../../../../lib/db/local-sync-environment'

export const dynamic = 'force-dynamic'
const reply = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } })

export async function POST(req: NextRequest) {
  if (!localSyncEnabled()) return reply({ result: 'rejected' }, 503)
  if (!checkOrigin(req)) return reply({ result: 'rejected' }, 403)
  if (Number(req.headers.get('content-length') || 0) > 8192) return reply({ result: 'rejected' }, 413)
  const account = await accountFromSession()
  if (!account) return reply({ result: 'rejected' }, 401)
  let input: Record<string, unknown>
  try {
    input = await req.json()
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Invalid input')
  } catch { return reply({ result: 'rejected' }, 400) }
  const { operationId, propertyId, entityId, entityType, action, baseRevision, payload } = input
  if (!uuid(operationId) || !uuid(propertyId) || !uuid(entityId) || entityType !== 'units' ||
      !['upsert', 'delete'].includes(String(action)) || !Number.isSafeInteger(baseRevision) ||
      (baseRevision as number) < 0 || (action === 'upsert' && (!payload || typeof payload !== 'object' ||
      typeof (payload as Record<string, unknown>).name !== 'string' ||
      (payload as Record<string, unknown>).name!.toString().trim().length < 1 ||
      (payload as Record<string, unknown>).name!.toString().length > 100))) return reply({ result: 'rejected' }, 400)
  const requestHash = createHash('sha256').update(JSON.stringify({ propertyId, entityId, entityType, action, baseRevision, payload })).digest('hex')
  try {
    return await withPostgresTransaction(async client => {
      if (!await canManageProperty(client, account.id, propertyId)) return reply({ result: 'rejected' }, 403)
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', ['sync-operation', operationId])
      const prior = await client.query('SELECT property_id, entity_id, request_hash, outcome, server_record FROM stayhub.local_sync_receipts WHERE operation_id=$1 FOR UPDATE', [operationId])
      if (prior.rowCount && (prior.rows[0].property_id !== propertyId || prior.rows[0].entity_id !== entityId || prior.rows[0].request_hash !== requestHash)) return reply({ result: 'rejected' }, 409)
      if (prior.rowCount) return reply({ result: 'duplicate', originalResult: prior.rows[0].outcome, serverRecord: prior.rows[0].server_record })
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [propertyId, entityId])
      const version = await client.query<{ revision: number }>('SELECT revision FROM stayhub.local_sync_revisions WHERE property_id=$1 AND entity_id=$2', [propertyId, entityId])
      const unit = await client.query<{ id: string; name: string }>('SELECT id,name FROM stayhub.units WHERE property_id=$1 AND id=$2', [propertyId, entityId])
      const currentRevision = version.rows[0]?.revision ?? (unit.rowCount ? 1 : 0)
      let result: 'accepted' | 'conflict' | 'rejected' = 'accepted'
      let serverRecord: unknown = unit.rows[0] ?? null
      if (currentRevision !== baseRevision) result = 'conflict'
      else if (action === 'delete') result = 'rejected'
      else {
        const name = (payload as { name: string }).name.trim()
        const saved = await client.query('INSERT INTO stayhub.units (id,property_id,name) VALUES($1,$2,$3) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name WHERE stayhub.units.property_id=$2 RETURNING id,name', [entityId, propertyId, name])
        if (!saved.rowCount) result = 'rejected'
        else {
          serverRecord = saved.rows[0]
          await client.query('INSERT INTO stayhub.local_sync_revisions(property_id,entity_id,revision) VALUES($1,$2,$3) ON CONFLICT(property_id,entity_id) DO UPDATE SET revision=EXCLUDED.revision', [propertyId, entityId, currentRevision + 1])
        }
      }
      await client.query('INSERT INTO stayhub.local_sync_receipts(operation_id,property_id,account_id,request_hash,entity_type,entity_id,outcome,server_record) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [operationId, propertyId, account.id, requestHash, entityType, entityId, result, JSON.stringify(serverRecord)])
      return reply({ result, serverRecord })
    })
  } catch { return reply({ result: 'rejected' }, 503) }
}
