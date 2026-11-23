import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDeviceWorkspace } from '../lib/local-workspace'
import { saveBillDraft, saveRoom } from '../lib/local-db/offline'
import { listSyncQueue, resolveSyncConflict, syncNow } from '../lib/local-db/sync'
import { getLocalRecord } from '../lib/local-db'

test('atomic local write and persistent queue, retries, conflict and held bill drafts', async () => {
  const workspace = await createDeviceWorkspace('Example', 'Example property')
  const room = await saveRoom(workspace.id, '101')
  let queue = await listSyncQueue(workspace.id)
  assert.equal(queue.length, 1)
  assert.equal(queue[0].status, 'pending')
  assert.deepEqual((await getLocalRecord('units', workspace.id, room.id))?.name, '101')
  let attempts = 0
  await syncNow(workspace.id, async () => { attempts++; throw new Error('offline') })
  queue = await listSyncQueue(workspace.id)
  assert.equal(queue[0].status, 'failed')
  assert.equal(queue[0].attemptCount, 1)
  assert.equal(attempts, 1)
  await syncNow(workspace.id, async () => { attempts++; return { result: 'accepted' } })
  assert.equal(attempts, 1)
  const second = await saveRoom(workspace.id, '102')
  await syncNow(workspace.id, async () => { attempts++; return { result: 'conflict', serverRecord: { name: 'Server room' } } })
  queue = await listSyncQueue(workspace.id)
  assert.equal(queue.find(item => item.entityId === second.id)?.status, 'conflict')
  assert.deepEqual(queue.find(item => item.entityId === second.id)?.serverRecord, { name: 'Server room' })
  assert.equal((await getLocalRecord('units', workspace.id, second.id))?.name, '102')
  await resolveSyncConflict(workspace.id, queue.find(item => item.entityId === second.id)!.operationId, 'use_server')
  assert.equal((await getLocalRecord('units', workspace.id, second.id))?.name, 'Server room')
  await saveBillDraft(workspace.id, second.id, '2026-11', 'Example', 100)
  await syncNow(workspace.id, async operation => { if (operation.entityType === 'bills') throw Error('bill sent'); return { result: 'accepted' } })
  assert.equal((await listSyncQueue(workspace.id)).find(item => item.entityType === 'bills')?.status, 'pending')
  const other = await createDeviceWorkspace('Other', 'Other property')
  assert.equal((await listSyncQueue(other.id)).length, 0)
})

test('property link keeps distinct local and server identities', async () => {
  const { getPropertyLink, savePropertyLink } = await import('../lib/local-db/property-link')
  const local = await createDeviceWorkspace('Mapped owner', 'Mapped local property')
  const serverPropertyId = crypto.randomUUID()
  const accountId = crypto.randomUUID()
  assert.notEqual(local.id, serverPropertyId)
  assert.equal(await getPropertyLink(local.id), undefined)
  await savePropertyLink({ localPropertyId: local.id, serverPropertyId, accountId, linkedAt: new Date().toISOString() })
  assert.equal((await getPropertyLink(local.id))?.serverPropertyId, serverPropertyId)
  assert.equal((await getActiveWorkspaceForTest()).id, local.id)
})

async function getActiveWorkspaceForTest() {
  const { getActiveWorkspace } = await import('../lib/local-workspace')
  const workspace = await getActiveWorkspace()
  if (!workspace) throw new Error('Missing workspace')
  return workspace
}
