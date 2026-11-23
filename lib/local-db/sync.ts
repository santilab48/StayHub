import { requestValue, withTransaction } from './connection'
import type { LocalRecord } from './schema'

type Entity = 'units' | 'meter_readings' | 'bills'
type Action = 'upsert' | 'delete'
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed'
export interface SyncOperation {
  operationId: string
  propertyId: string
  entityType: Entity
  entityId: string
  action: Action
  baseRevision: number
  payload: unknown
  createdAt: string
  attemptCount: number
  status: SyncStatus
  nextAttemptAt?: number
  serverRecord?: unknown
  error?: string
}

export async function queueChange(tx: { enqueue: (entry: SyncOperation) => Promise<void> }, propertyId: string, entityType: Entity, record: LocalRecord<Entity>, baseRevision: number) {
  await tx.enqueue({
    operationId: crypto.randomUUID(), propertyId, entityType, entityId: record.id,
    action: 'upsert', baseRevision, payload: record, createdAt: new Date().toISOString(),
    attemptCount: 0, status: 'pending',
  })
}

export function listSyncQueue(propertyId: string): Promise<SyncOperation[]> {
  return withTransaction(['sync_queue'], 'readonly', tx => requestValue(tx.objectStore('sync_queue').index('propertyId').getAll(propertyId)))
}

export async function syncNow(propertyId: string, send: (operation: SyncOperation) => Promise<{ result: 'accepted' | 'duplicate' | 'conflict' | 'rejected'; serverRecord?: unknown; originalResult?: 'accepted' | 'conflict' | 'rejected' }>) {
  const operations = await listSyncQueue(propertyId)
  operations.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.operationId.localeCompare(b.operationId))
  const blockedEntities = new Set<string>()
  for (const operation of operations) {
    const entityKey = `${operation.entityType}:${operation.entityId}`
    if (blockedEntities.has(entityKey)) continue
    if (operation.status !== 'pending' && operation.status !== 'failed' && operation.status !== 'syncing') continue
    if (operation.attemptCount >= 5 || (operation.nextAttemptAt ?? 0) > Date.now()) continue
    // Bill drafts require a dedicated server validation path before they can be sent.
    if (operation.entityType === 'bills' || operation.entityType === 'meter_readings') continue
    await withTransaction(['sync_queue'], 'readwrite', async tx => {
      operation.status = 'syncing'
      operation.attemptCount++
      await requestValue(tx.objectStore('sync_queue').put(operation))
    })
    try {
      const response = await send(operation)
      const outcome = response.result === 'duplicate' ? response.originalResult : response.result
      operation.status = outcome === 'accepted' ? 'synced'
        : outcome === 'conflict' ? 'conflict' : 'failed'
      operation.serverRecord = response.serverRecord
      operation.error = outcome === 'rejected' ? 'Server rejected this change' : undefined
      if (outcome === 'rejected') operation.attemptCount = 5
    } catch (error) {
      operation.status = 'failed'
      operation.error = error instanceof Error ? error.message : 'Network error'
      operation.nextAttemptAt = Date.now() + 1000 * 2 ** operation.attemptCount
    }
    await withTransaction(['sync_queue'], 'readwrite', async tx => { await requestValue(tx.objectStore('sync_queue').put(operation)) })
    if (operation.status !== 'synced') blockedEntities.add(entityKey)
  }
}

export async function resolveSyncConflict(propertyId: string, operationId: string, choice: 'keep_local' | 'use_server' | 'cancel') {
  await withTransaction(['sync_queue', 'units'], 'readwrite', async tx => {
    const store = tx.objectStore('sync_queue')
    const operation: SyncOperation | undefined = await requestValue(store.get(operationId))
    if (!operation || operation.propertyId !== propertyId || operation.status !== 'conflict') throw new Error('Conflict not found')
    const previousOperationId = operation.operationId
    if (choice === 'keep_local') {
      const remoteRevision = (operation.serverRecord as { revision?: unknown } | null)?.revision
      if (!Number.isSafeInteger(remoteRevision) || (remoteRevision as number) < 0)
        throw new Error('Server revision is unavailable; local data has not been changed')
      // A new operation ID is required: the server binds each ID to a request hash.
      // Keep the local value intact, and retry against the exact server revision.
      operation.operationId = crypto.randomUUID()
      operation.baseRevision = remoteRevision as number
      operation.attemptCount = 0
      operation.status = 'pending'
      operation.nextAttemptAt = undefined
      operation.error = undefined
    } else if (choice === 'cancel') {
      operation.status = 'failed'
      operation.attemptCount = 5
      operation.error = 'ยกเลิกการซิงก์แล้ว'
    } else {
      if (operation.entityType !== 'units' || !operation.serverRecord ||
          typeof (operation.serverRecord as { name?: unknown }).name !== 'string') throw new Error('Server record is unavailable')
      const local: LocalRecord<'units'> | undefined = await requestValue(tx.objectStore('units').get(operation.entityId))
      if (!local || local.propertyId !== propertyId) throw new Error('Local record is unavailable')
      await requestValue(tx.objectStore('units').put({ ...local, name: (operation.serverRecord as { name: string }).name, localRevision: local.localRevision + 1, updatedAt: new Date().toISOString() }))
      operation.status = 'synced'
      operation.error = undefined
    }
    if (operation.operationId !== previousOperationId) await requestValue(store.delete(previousOperationId))
    await requestValue(store.put(operation))
  })
}

export interface ServerUnit {
  id: string
  name: string
  revision: number
}

interface RoomSnapshot {
  serverPropertyId: string
  name: string
  revision: number
}

const roomSnapshotKey = (propertyId: string, unitId: string) => `sync-room:${propertyId}:${unitId}`
const uuidPattern = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

/**
 * A complete server page is merged in one IndexedDB transaction.
 * Unknown local records and all pending edits stay on this device untouched.
 * Snapshots preserve the last *acknowledged* server value for subsequent pulls.
 */
export async function mergeServerUnits(
  propertyId: string, serverPropertyId: string, units: ServerUnit[],
): Promise<{ imported: number; updated: number; protected: number }> {
  if (!uuidPattern.test(propertyId) || !uuidPattern.test(serverPropertyId) ||
      !Array.isArray(units) || units.length > 100) throw new Error('Invalid remote page')
  const ids = new Set<string>()
  for (const unit of units) {
    if (!unit || !uuidPattern.test(unit.id) || typeof unit.name !== 'string' ||
        !unit.name.trim() || unit.name.length > 100 ||
        !Number.isSafeInteger(unit.revision) || unit.revision < 1 || ids.has(unit.id))
      throw new Error('Invalid remote unit')
    ids.add(unit.id)
  }
  return withTransaction(['properties','units','sync_queue','workspaces'], 'readwrite', async tx => {
    if (!await requestValue(tx.objectStore('properties').get(propertyId)))
      throw new Error('Local workspace not found')
    const queue: SyncOperation[] = await requestValue(tx.objectStore('sync_queue').index('propertyId').getAll(propertyId))
    const unitStore = tx.objectStore('units')
    const meta = tx.objectStore('workspaces')
    const now = new Date().toISOString()
    let imported = 0, updated = 0, protectedCount = 0
    for (const remote of units) {
      const entries = queue.filter(item => item.entityType === 'units' && item.entityId === remote.id)
      // Cancelled / failed / conflicted operations still reflect unresolved local edits.
      if (entries.some(item => item.status !== 'synced')) { protectedCount++; continue }
      const prior: LocalRecord<'units'> | undefined = await requestValue(unitStore.get(remote.id))
      if (prior && prior.propertyId !== propertyId)
        throw new Error('Remote room ID belongs to another workspace')
      const key = roomSnapshotKey(propertyId,remote.id)
      const snapshot: RoomSnapshot | undefined = await requestValue(meta.get(key))
      if (snapshot && snapshot.serverPropertyId !== serverPropertyId) {
        protectedCount++
        continue
      }
      const acknowledged = entries.filter(item => item.status === 'synced')
        .sort((a,b) => b.createdAt.localeCompare(a.createdAt) || b.operationId.localeCompare(a.operationId))[0]
      const knownName = snapshot?.name ?? (acknowledged?.serverRecord as {name?: unknown}|null)?.name
      // No baseline => cannot prove this local record is safe to replace.
      if (prior && (typeof knownName !== 'string' || knownName !== prior.name)) {
        protectedCount++
        continue
      }
      if (prior && snapshot && prior.localRevision > snapshot.revision &&
          snapshot.name === remote.name && remote.revision <= snapshot.revision) {
        // A locally advanced revision needs no downgrade.
        continue
      }
      if (prior && prior.localRevision > remote.revision && prior.name !== remote.name) {
        protectedCount++
        continue
      }
      const baseline: RoomSnapshot = {serverPropertyId,name:remote.name,revision:remote.revision}
      if (prior && prior.name === remote.name) {
        // Confirm the current server version for the next pull, without rewriting
        // local records or lowering their local revision.
        await requestValue(meta.put(baseline,key))
        continue
      }
      const record: LocalRecord<'units'> = {
        id: remote.id, propertyId, name: remote.name,
        createdAt: prior?.createdAt ?? now, updatedAt: now,
        schemaVersion: 1, localRevision: remote.revision,
      }
      await requestValue(unitStore.put(record))
      await requestValue(meta.put(baseline,key))
      if (prior) updated++
      else imported++
    }
    return { imported, updated, protected: protectedCount }
  })
}

/** Pull a bounded property snapshot with fresh authorization for every HTTP page. */
export async function pullServerUnits(
  localPropertyId: string,
  serverPropertyId: string,
  load: (after?: string) => Promise<{ units: ServerUnit[]; nextCursor: string | null }>,
): Promise<{ imported: number; updated: number; protected: number }> {
  if (!uuidPattern.test(serverPropertyId)) throw new Error('Invalid linked property ID')
  const total = { imported: 0, updated: 0, protected: 0 }
  const seen = new Set<string>()
  let after: string | undefined
  for (let page = 0; page < 100; page++) {
    const result = await load(after)
    if (!result || !Array.isArray(result.units) || result.units.length > 100 ||
        (result.nextCursor !== null && (typeof result.nextCursor !== 'string' ||
        !uuidPattern.test(result.nextCursor)))) throw new Error('Invalid sync response')
    const merged = await mergeServerUnits(localPropertyId, serverPropertyId, result.units)
    total.imported += merged.imported
    total.updated += merged.updated
    total.protected += merged.protected
    if (!result.nextCursor) return total
    if (!result.units.length || result.nextCursor === after || seen.has(result.nextCursor))
      throw new Error('Invalid pagination cursor')
    seen.add(result.nextCursor)
    after = result.nextCursor
  }
  throw new Error('Sync page limit reached')
}
