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

test('keep-local conflict rebases onto server revision without mutating local room', async () => {
  const workspace = await createDeviceWorkspace('Sync owner', 'Sync property')
  const room = await saveRoom(workspace.id, 'Local room')
  await syncNow(workspace.id, async () => ({ result: 'conflict', serverRecord: { name: 'Server room', revision: 3 } }))
  const before = (await listSyncQueue(workspace.id)).find(op => op.entityId === room.id)!
  assert.equal(before.status, 'conflict')
  await resolveSyncConflict(workspace.id, before.operationId, 'keep_local')
  const after = (await listSyncQueue(workspace.id)).find(op => op.entityId === room.id)!
  assert.equal(after.status, 'pending')
  assert.equal(after.baseRevision, 3)
  assert.equal(after.attemptCount, 0)
  assert.notEqual(after.operationId, before.operationId)
  assert.equal((await getLocalRecord('units', workspace.id, room.id))?.name, 'Local room')
  let sentRevision = -1
  await syncNow(workspace.id, async op => {
    sentRevision = op.baseRevision
    return { result: 'accepted', serverRecord: { name: 'Local room', revision: 4 } }
  })
  assert.equal(sentRevision, 3)
  assert.equal((await listSyncQueue(workspace.id)).find(op => op.entityId === room.id)?.status, 'synced')
})

test('pull: import remote room, keep pending local edits and refresh acknowledged remote changes', async () => {
  const { mergeServerUnits, pullServerUnits } = await import('../lib/local-db/sync')
  const { listLocalRecords } = await import('../lib/local-db')
  const local = await createDeviceWorkspace('Device B', 'Shared property')
  const remoteId = crypto.randomUUID()
  const first = await pullServerUnits(local.id, crypto.randomUUID(), async () => ({
    units: [{ id: remoteId, name: 'Room 101', revision: 1 }], nextCursor: null,
  }))
  assert.deepEqual(first, { imported: 1, updated: 0, protected: 0 })
  assert.equal((await getLocalRecord('units', local.id, remoteId))?.name, 'Room 101')
  const fresh = await mergeServerUnits(local.id, [{ id: remoteId, name: 'Room 101 changed', revision: 2 }])
  assert.equal(fresh.protected, 1, 'untracked local records are never overwritten')
  assert.equal((await getLocalRecord('units', local.id, remoteId))?.name, 'Room 101')
  const changed = await saveRoom(local.id, 'Offline edit', (await getLocalRecord('units', local.id, remoteId))!)
  const queued = await listSyncQueue(local.id)
  assert.ok(queued.some(item => item.entityId === remoteId && item.status === 'pending'))
  await mergeServerUnits(local.id, [{ id: remoteId, name: 'Remote edit', revision: 3 }])
  assert.equal((await getLocalRecord('units', local.id, remoteId))?.name, changed.name)
  await syncNow(local.id, async op => ({
    result: 'accepted', serverRecord: { id: op.entityId, name: 'Offline edit', revision: 2 },
  }))
  const ack = await mergeServerUnits(local.id, [{ id: remoteId, name: 'Updated elsewhere', revision: 3 }])
  assert.equal(ack.updated, 1)
  assert.equal((await getLocalRecord('units', local.id, remoteId))?.name, 'Updated elsewhere')
  assert.equal((await listLocalRecords('units', local.id)).records.length, 1)
})

test('pull: pagination, invalid page and cross-workspace ID never corrupt data', async () => {
  const { mergeServerUnits, pullServerUnits } = await import('../lib/local-db/sync')
  const a = await createDeviceWorkspace('Owner A', 'A')
  const b = await createDeviceWorkspace('Owner B', 'B')
  const roomB = await saveRoom(b.id, 'B Private')
  const remoteA = crypto.randomUUID()
  const cursors: (string | undefined)[] = []
  const result = await pullServerUnits(a.id, crypto.randomUUID(), async after => {
    cursors.push(after)
    return after ? { units: [{ id: crypto.randomUUID(), name: 'Second page', revision: 1 }], nextCursor: null }
      : { units: [{ id: remoteA, name: 'First page', revision: 1 }], nextCursor: remoteA }
  })
  assert.equal(result.imported, 2)
  assert.deepEqual(cursors, [undefined, remoteA])
  await assert.rejects(
    mergeServerUnits(a.id, [{ id: roomB.id, name: 'Other property', revision: 2 }]),
    /another workspace/,
  )
  assert.equal((await getLocalRecord('units', b.id, roomB.id))?.name, 'B Private')
  await assert.rejects(
    mergeServerUnits(a.id, [{ id: crypto.randomUUID(), name: '', revision: 1 }]),
    /Invalid remote unit/,
  )
  await assert.rejects(
    pullServerUnits(a.id, crypto.randomUUID(), async () => ({ units: [], nextCursor: remoteA })),
    /Invalid pagination cursor/,
  )
})
