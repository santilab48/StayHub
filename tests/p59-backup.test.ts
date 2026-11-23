import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDeviceWorkspace } from '../lib/local-workspace'
import { saveRoom, saveMeter, saveBillDraft } from '../lib/local-db/offline'
import { mergeServerUnits, listSyncQueue } from '../lib/local-db/sync'
import { getLocalRecord, listLocalRecords } from '../lib/local-db'
import { createBackup, inspectBackup, restoreBackup } from '../lib/local-db/backup'
import { getPropertyLink, savePropertyLink } from '../lib/local-db/property-link'

test('P5.9 encrypted backup round-trip preserves offline drafts and per-room sync metadata', async () => {
  const workspace=await createDeviceWorkspace('Backup owner','Backup property')
  const room=await saveRoom(workspace.id,'Offline 101')
  await saveMeter(workspace.id,room.id,'water',42,'2026-11-23')
  await saveBillDraft(workspace.id,room.id,'2026-11','Offline draft',12345)
  const remotePropertyId=crypto.randomUUID()
  const remoteRoom=crypto.randomUUID()
  const accountId=crypto.randomUUID()
  await savePropertyLink({
    localPropertyId:workspace.id,serverPropertyId:remotePropertyId,accountId,
    linkedAt:new Date().toISOString(),
  })
  const pulled=await mergeServerUnits(workspace.id,remotePropertyId,[{
    id:remoteRoom,name:'Server room 202',revision:2,
  }])
  assert.equal(pulled.imported,1)
  const oldQueue=await listSyncQueue(workspace.id)
  assert.equal(oldQueue.filter(entry=>entry.status==='pending').length,3)
  const password='P59-Test-Encryption-Only-Strong!'
  const backup=await createBackup(password)
  assert.ok(backup.blob.size>100)
  assert.equal(backup.filename.endsWith('.shbackup'),true)
  const json=await backup.blob.text()
  assert.ok(!json.includes('Offline draft'),'plaintext bill data must be encrypted')
  assert.ok(!json.includes(remoteRoom),'plaintext remote ID must be encrypted')
  const info=await inspectBackup(backup.blob,password)
  assert.equal(info.counts.bills,1)
  assert.equal(info.counts.sync_queue,3)
  assert.equal(info.counts.units,2)
  await assert.rejects(inspectBackup(backup.blob,'incorrect-password-123'),/รหัสสำรอง/)
  const tampered=JSON.parse(json)
  tampered.ciphertext=tampered.ciphertext.slice(0,-4)+'AAAA'
  await assert.rejects(inspectBackup(new Blob([JSON.stringify(tampered)]),password),/รหัสสำรอง/)
  const newRoom=await saveRoom(workspace.id,'After backup')
  assert.ok(await getLocalRecord('units',workspace.id,newRoom.id))
  await assert.rejects(restoreBackup(backup.blob,password,false),/ยืนยัน/)
  assert.ok(await getLocalRecord('units',workspace.id,newRoom.id),'confirmation check never clears data')
  await restoreBackup(backup.blob,password,true)
  assert.equal(await getLocalRecord('units',workspace.id,newRoom.id),undefined)
  assert.equal((await getLocalRecord('units',workspace.id,remoteRoom))?.name,'Server room 202')
  assert.equal((await listLocalRecords('bills',workspace.id)).records.length,1)
  assert.equal((await listLocalRecords('meter_readings',workspace.id)).records.length,1)
  assert.equal((await listSyncQueue(workspace.id)).filter(entry=>entry.status==='pending').length,3)
  assert.equal(await getPropertyLink(workspace.id),undefined,
    'after restore server property link requires fresh authorization')
  console.log('P5.9 encrypted backup restore, sync metadata, offline drafts and link reauthorization passed')
})
