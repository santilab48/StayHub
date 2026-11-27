import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getActiveWorkspace, createDeviceWorkspace } from '../lib/local-workspace'
import { getBillItems, listAllLocal, removeRoom, saveBillDraft, saveMeter, saveRoom } from '../lib/local-db/offline'
import { getLocalRecord } from '../lib/local-db'

test('room, meter and bill drafts persist after reopening the database', async () => {
  const workspace = await createDeviceWorkspace('Example owner', 'Example property')
  const room = await saveRoom(workspace.id, '101')
  const changed = await saveRoom(workspace.id, '102', room)
  await assert.rejects(saveRoom(workspace.id, 'stale', room), /changed/)
  const meter = await saveMeter(workspace.id, room.id, 'water', 12.5, '2026-11-23')
  await saveMeter(workspace.id, room.id, 'water', 13, '2026-11-24', meter)
  const bill = await saveBillDraft(workspace.id, room.id, '2026-11', 'Rent', 120000)
  await assert.rejects(saveBillDraft(workspace.id, room.id, '2026-11', 'Duplicate', 100), /มีบิล/)
  await assert.rejects(saveBillDraft(workspace.id, room.id, '2026-12', 'Invalid', 1.5), /ไม่ถูกต้อง/)
  await saveBillDraft(workspace.id, room.id, '2026-11', 'Updated rent', 125000, bill)
  await assert.rejects(removeRoom(workspace.id, changed), /bills/)
  assert.deepEqual(await getActiveWorkspace(), workspace)
  assert.equal((await listAllLocal('units', workspace.id))[0].name, '102')
  assert.equal((await listAllLocal('meter_readings', workspace.id))[0].reading, 13)
  assert.equal((await getBillItems(workspace.id, bill.id))[0].amountMinor, 125000)
  assert.equal((await getLocalRecord('bills', workspace.id, bill.id))?.totalMinor, 125000)
  const other = await createDeviceWorkspace('Other owner', 'Other property')
  assert.equal((await listAllLocal('bills', other.id)).length, 0)
})
