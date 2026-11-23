import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  deleteLocalRecord, getLocalDatabaseVersion, getLocalRecord, listLocalRecords,
  LocalRevisionConflict, openLocalDB, putLocalRecord, runLocalTransaction,
} from '../lib/local-db'
import { createDeviceWorkspace, getActiveWorkspace } from '../lib/local-workspace'

const database = 'stayhub-device-v1'

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result)
    value.onerror = () => reject(value.error)
  })
}

afterEach(() => request(indexedDB.deleteDatabase(database)).then(() => {}))

async function property(name = 'Example property') {
  const id = crypto.randomUUID()
  return putLocalRecord('properties', id, { name })
}

test('creates every required store and preserves the workspace store', async () => {
  const db = await openLocalDB()
  try {
    assert.equal(await getLocalDatabaseVersion(), 2)
    assert.deepEqual([...db.objectStoreNames], [
      'announcements', 'bill_items', 'bills', 'change_log', 'leases', 'meter_readings',
      'parcels', 'payments', 'properties', 'repairs', 'residents', 'settings',
      'units', 'vehicles', 'workspaces',
    ])
  } finally {
    db.close()
  }
})

test('scopes reads and mutations to one property and paginates indexed results', async () => {
  const first = await property()
  const second = await property('Second example property')
  const create = () => putLocalRecord('units', first.id, { name: '101' })
  const [unit, other] = await Promise.all([create(), create()])
  await putLocalRecord('units', second.id, { name: '101' })
  const where = { field: 'name', equals: '101' } as const
  const page = await listLocalRecords('units', first.id, { limit: 1, where })
  assert.equal(page.records.length, 1)
  assert.ok(page.nextCursor)
  const next = await listLocalRecords('units', first.id, { limit: 1, where, afterId: page.nextCursor })
  assert.equal(next.nextCursor, undefined)
  assert.deepEqual([...page.records, ...next.records].map(row => row.id).sort(), [unit.id, other.id].sort())
  assert.equal(await getLocalRecord('units', second.id, unit.id), undefined)
  await assert.rejects(deleteLocalRecord('units', second.id, unit.id, 1), LocalRevisionConflict)

  const updated = await putLocalRecord('units', first.id, { name: '102' }, { id: unit.id, expectedRevision: 1 })
  assert.equal(updated.localRevision, 2)
  assert.equal(updated.createdAt, unit.createdAt)
  assert.deepEqual(await getLocalRecord('units', first.id, unit.id), updated)
  await deleteLocalRecord('units', first.id, unit.id, 2)
  assert.equal(await getLocalRecord('units', first.id, unit.id), undefined)
  const changes = await listLocalRecords('change_log', first.id, { where: { field: 'recordId', equals: unit.id } })
  assert.deepEqual(changes.records.map(row => row.operation).sort(), ['create', 'delete', 'update'])
  await assert.rejects(putLocalRecord('settings', first.id, { name: 'theme', value: '' }), /Invalid settings.value/)
  const extraField = { name: '103', password: 'mock-secret' }
  await assert.rejects(putLocalRecord('units', first.id, extraField), /Unexpected local record field/)
})

test('rolls back stale revisions and callback failures including their change log', async () => {
  const { id } = await property()
  const unit = await putLocalRecord('units', id, { name: '101' })
  const update = (name: string) => putLocalRecord('units', id, { name }, { id: unit.id, expectedRevision: 1 })
  const results = await Promise.allSettled([update('102'), update('103')])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.ok(results.some(result => result.status === 'rejected' && result.reason instanceof LocalRevisionConflict))

  await assert.rejects(runLocalTransaction(id, async tx => {
    await tx.put('units', { name: '104' })
    await tx.put('units', { name: '105' }, { id: unit.id, expectedRevision: 1 })
  }), LocalRevisionConflict)
  await assert.rejects(runLocalTransaction(id, async tx => {
    await tx.put('units', { name: '106' })
    await new Promise(resolve => setTimeout(resolve, 1))
    throw new Error('cancel')
  }), /cancel/)
  assert.equal((await listLocalRecords('units', id)).records.length, 1)
  assert.equal((await listLocalRecords('change_log', id)).records.length, 3)
})

test('checks financial relationships and totals before committing', async () => {
  const { id } = await property()
  const other = await property('Other property')
  const unit = await putLocalRecord('units', id, { name: '101' })
  const bill = await runLocalTransaction(id, async tx => {
    const created = await tx.put('bills', { unitId: unit.id, period: '2026-11', totalMinor: 1000 })
    await tx.put('bill_items', { billId: created.id, description: 'Example rent', amountMinor: 1000 })
    return created
  })
  const payment = { billId: bill.id, amountMinor: 600, paidOn: '2026-11-23' }
  await assert.rejects(putLocalRecord('payments', other.id, payment), /same property/)
  await putLocalRecord('payments', id, payment)
  await assert.rejects(putLocalRecord('payments', id, payment), /payments within/)
  await assert.rejects(deleteLocalRecord('bills', id, bill.id, 1), /require a bill/)
  await assert.rejects(putLocalRecord('bills', id, {
    unitId: unit.id, period: bill.period, totalMinor: 900,
  }, { id: bill.id, expectedRevision: 1 }), /matching item total/)
  assert.deepEqual(await getLocalRecord('bills', id, bill.id), bill)
  assert.equal((await listLocalRecords('payments', id)).records.length, 1)
})

async function seedLegacyWorkspace(dormName: string) {
  const legacy = indexedDB.open(database, 1)
  legacy.onupgradeneeded = () => legacy.result.createObjectStore('workspaces')
  const db = await request(legacy)
  try {
    const workspace = {
      id: crypto.randomUUID(), ownerName: 'Example owner', dormName,
      createdAt: new Date().toISOString(), version: 1,
    }
    const tx = db.transaction('workspaces', 'readwrite')
    const store = tx.objectStore('workspaces')
    store.add(workspace, `workspace:${workspace.id}`)
    await request(store.add(workspace.id, 'active-workspace'))
    return workspace
  } finally {
    db.close()
  }
}

test('upgrades in place and keeps the original active workspace readable', async () => {
  const legacy = await seedLegacyWorkspace('Legacy example')
  assert.deepEqual(await getActiveWorkspace(), legacy)
  const migrated = await getLocalRecord('properties', legacy.id, legacy.id)
  assert.equal(migrated?.name, legacy.dormName)
  assert.equal(migrated?.createdAt, legacy.createdAt)
  assert.deepEqual(await createDeviceWorkspace(legacy.ownerName, legacy.dormName), legacy)
  assert.equal((await listLocalRecords('properties', legacy.id)).records.length, 1)
  const newWorkspace = await createDeviceWorkspace('Example owner', 'Another property')
  assert.deepEqual(await getActiveWorkspace(), newWorkspace)
  assert.equal((await getLocalRecord('properties', newWorkspace.id, newWorkspace.id))?.name, newWorkspace.dormName)
})

test('failed migration rolls back schema changes and preserves legacy data', async () => {
  const workspace = await seedLegacyWorkspace('')
  await assert.rejects(openLocalDB(), /Invalid properties.name/)
  const db = await request(indexedDB.open(database, 1))
  try {
    assert.deepEqual([...db.objectStoreNames], ['workspaces'])
    const store = db.transaction('workspaces').objectStore('workspaces')
    assert.deepEqual(await request(store.get(`workspace:${workspace.id}`)), workspace)
  } finally {
    db.close()
  }
})
