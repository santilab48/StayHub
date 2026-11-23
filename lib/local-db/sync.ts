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
    if (choice === 'keep_local') {
      operation.error = 'ข้อมูลในเครื่องยังอยู่ กรุณาตรวจ revision ของ Server ก่อนส่งอีกครั้ง'
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
    await requestValue(store.put(operation))
  })
}
