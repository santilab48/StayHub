import { deleteLocalRecord, getLocalRecord, listLocalRecords, putLocalRecord, runLocalTransaction } from './index'
import type { LocalRecord } from './schema'

export const localDraft = 'local_draft' as const

export async function listAllLocal<S extends 'units' | 'meter_readings' | 'bills' | 'bill_items'>(store: S, propertyId: string) {
  const records: LocalRecord<S>[] = []
  let afterId: string | undefined
  do {
    const page = await listLocalRecords(store, propertyId, { limit: 500, afterId })
    records.push(...page.records)
    afterId = page.nextCursor
  } while (afterId)
  return records
}

export async function saveRoom(propertyId: string, name: string, existing?: LocalRecord<'units'>) {
  return putLocalRecord('units', propertyId, { name: name.trim() }, existing && { id: existing.id, expectedRevision: existing.localRevision })
}

export async function removeRoom(propertyId: string, room: LocalRecord<'units'>) {
  return deleteLocalRecord('units', propertyId, room.id, room.localRevision)
}

export async function saveMeter(propertyId: string, unitId: string, meter: 'water' | 'electric', reading: number, readOn: string, existing?: LocalRecord<'meter_readings'>) {
  if (!Number.isFinite(reading) || reading < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(readOn)) throw new Error('ข้อมูลมิเตอร์ไม่ถูกต้อง')
  return runLocalTransaction(propertyId, async tx => {
    if (!await tx.get('units', unitId)) throw new Error('ไม่พบห้องพักในที่พักนี้')
    return tx.put('meter_readings', { unitId, meter, reading, readOn }, existing && { id: existing.id, expectedRevision: existing.localRevision })
  })
}

export async function saveBillDraft(propertyId: string, unitId: string, period: string, description: string, amountMinor: number, existing?: LocalRecord<'bills'>) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || !description.trim() || !Number.isSafeInteger(amountMinor) || amountMinor < 0) throw new Error('ข้อมูลบิลไม่ถูกต้อง')
  return runLocalTransaction(propertyId, async tx => {
    if (!await tx.get('units', unitId)) throw new Error('ไม่พบห้องพักในที่พักนี้')
    const bills = await tx.list('bills')
    if (bills.some(bill => bill.unitId === unitId && bill.period === period && bill.id !== existing?.id)) throw new Error('ห้องนี้มีบิลสำหรับรอบดังกล่าวแล้ว')
    const bill = await tx.put('bills', { unitId, period, totalMinor: amountMinor }, existing && { id: existing.id, expectedRevision: existing.localRevision })
    if (existing) {
      const items = (await tx.list('bill_items')).filter(item => item.billId === existing.id)
      for (const item of items) await tx.delete('bill_items', item.id, item.localRevision)
    }
    await tx.put('bill_items', { billId: bill.id, description: description.trim(), amountMinor })
    return bill
  })
}

export async function getBillItems(propertyId: string, billId: string) {
  if (!await getLocalRecord('bills', propertyId, billId)) return []
  return (await listLocalRecords('bill_items', propertyId, { where: { field: 'billId', equals: billId } })).records
}
