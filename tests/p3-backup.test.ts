import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDeviceWorkspace, getActiveWorkspace } from '../lib/local-workspace'
import { saveBillDraft, saveRoom } from '../lib/local-db/offline'
import { createBackup, inspectBackup, restoreBackup } from '../lib/local-db/backup'
import { listAllLocal } from '../lib/local-db/offline'
import { listSyncQueue } from '../lib/local-db/sync'
import { getPropertyLink, savePropertyLink } from '../lib/local-db/property-link'
import { requestValue, withTransaction } from '../lib/local-db/connection'

const password = 'example backup password'

test('encrypted backup restores rooms, bills, workspace and pending queue', async () => {
  const workspace = await createDeviceWorkspace('Example owner', 'Example property')
  const room = await saveRoom(workspace.id, '101')
  await saveBillDraft(workspace.id, room.id, '2026-11', 'Rent', 10000)
  await savePropertyLink({ localPropertyId: workspace.id, serverPropertyId: crypto.randomUUID(), accountId: crypto.randomUUID(), linkedAt: new Date().toISOString() })
  const backup = await createBackup(password)
  assert.ok(backup.filename.endsWith('.shbackup'))
  assert.equal(backup.preview.counts.units, 1)
  const fileText = await backup.blob.text()
  assert.ok(!fileText.includes('Example owner'))
  assert.ok(!fileText.includes('Rent'))
  await assert.rejects(inspectBackup(backup.blob, 'wrong backup password'), /รหัสสำรอง/)
  const modified = JSON.parse(fileText)
  modified.ciphertext = modified.ciphertext.slice(0, -4) + 'AAAA'
  await assert.rejects(inspectBackup(new Blob([JSON.stringify(modified)]), password), /รหัสสำรอง/)
  modified.header.formatVersion = 99
  await assert.rejects(inspectBackup(new Blob([JSON.stringify(modified)]), password), /เวอร์ชัน/)
  await saveRoom(workspace.id, '102')
  await assert.rejects(restoreBackup(backup.blob, password, false), /ยืนยัน/)
  assert.equal((await listAllLocal('units', workspace.id)).length, 2)
  await restoreBackup(backup.blob, password, true)
  assert.equal((await listAllLocal('units', workspace.id)).length, 1)
  assert.equal((await listAllLocal('bills', workspace.id)).length, 1)
  assert.equal((await listSyncQueue(workspace.id)).filter(item => item.status === 'pending').length, 2)
  assert.deepEqual(await getActiveWorkspace(), workspace)
  assert.equal(await getPropertyLink(workspace.id), undefined)
})

test('rejects cross-workspace restore and sensitive fields without altering data', async () => {
  const workspace = await getActiveWorkspace()
  assert.ok(workspace)
  const backup = await createBackup(password)
  await withTransaction(['settings'], 'readwrite', async tx => {
    await requestValue(tx.objectStore('settings').add({ id: crypto.randomUUID(), propertyId: workspace.id, name: 'password', value: 'never-export', localRevision: 1, schemaVersion: 1 }))
  })
  await assert.rejects(createBackup(password), /ข้อมูลลับ/)
  await withTransaction(['settings'], 'readwrite', async tx => { await requestValue(tx.objectStore('settings').clear()) })
  await createDeviceWorkspace('Different owner', 'Different property')
  await assert.rejects(restoreBackup(backup.blob, password, true), /พื้นที่ใช้งานอื่น/)
  assert.equal((await getActiveWorkspace())?.dormName, 'Different property')
})
