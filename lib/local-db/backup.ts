import { openLocalDB, requestValue, withTransaction } from './connection'
import { DATABASE_VERSION, fields, validateId, validateInput, type Store } from './schema'

type Entry = { key: IDBValidKey; value: unknown }
type Snapshot = { formatVersion: 1; schemaVersion: number; createdAt: string; propertyIds: string[]; stores: Record<string, Entry[]> }
type Header = { formatVersion: 1; kdf: 'PBKDF2-SHA256'; iterations: number; cipher: 'AES-256-GCM'; salt: string; iv: string }
export type BackupPreview = { createdAt: string; schemaVersion: number; propertyIds: string[]; counts: Record<string, number>; totalRecords: number; currentDataIsNewer: boolean }
const ITERATIONS = 310_000
const MAX_FILE_SIZE = 64 * 1024 * 1024
const sensitive = /(password|token|secret|credential|cookie|api.?key|session)/i
const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
const bytes = (value: Uint8Array) => btoa(Array.from(value, byte => String.fromCharCode(byte)).join(''))
const unbytes = (value: string) => Uint8Array.from(atob(value), character => character.charCodeAt(0))

async function keyFor(password: string, salt: Uint8Array) {
  if (password.length < 12) throw new Error('รหัสสำรองต้องมีอย่างน้อย 12 ตัวอักษร')
  const base = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: new Uint8Array(salt), iterations: ITERATIONS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

function rejectSensitive(value: unknown, path = ''): void {
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (sensitive.test(key) || (key === 'name' && typeof child === 'string' && sensitive.test(child))) throw new Error(`ข้อมูลลับอยู่ใน ${path || 'ข้อมูลในเครื่อง'}; ไม่สร้างไฟล์สำรอง`)
    rejectSensitive(child, `${path}.${key}`)
  }
}

async function readSnapshot(): Promise<Snapshot> {
  const db = await openLocalDB()
  const names = [...db.objectStoreNames]
  db.close()
  return withTransaction(names, 'readonly', async tx => {
    const stores: Record<string, Entry[]> = {}
    for (const name of names) {
      const entries: Entry[] = []
      const store = tx.objectStore(name)
      await new Promise<void>((resolve, reject) => {
        const cursor = store.openCursor()
        cursor.onerror = () => reject(cursor.error)
        cursor.onsuccess = () => {
          const row = cursor.result
          if (!row) return resolve()
          try {
            const value = structuredClone(row.value)
            rejectSensitive(value, name)
            entries.push({ key: row.primaryKey, value })
            row.continue()
          } catch (error) { reject(error) }
        }
      })
      stores[name] = entries
    }
    const propertyIds = (stores.properties ?? []).map(entry => (entry.value as { id: string }).id)
    return { formatVersion: 1, schemaVersion: tx.db.version, createdAt: new Date().toISOString(), propertyIds, stores }
  })
}

export async function createBackup(password: string): Promise<{ blob: Blob; filename: string; preview: BackupPreview }> {
  const snapshot = await readSnapshot()
  validateSnapshot(snapshot)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const header: Header = { formatVersion: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, cipher: 'AES-256-GCM', salt: bytes(salt), iv: bytes(iv) }
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(JSON.stringify(header)) }, await keyFor(password, salt), encoder.encode(JSON.stringify(snapshot)))
  const blob = new Blob([JSON.stringify({ header, ciphertext: bytes(new Uint8Array(ciphertext)) })], { type: 'application/octet-stream' })
  return { blob, filename: `stayhub-${snapshot.createdAt.slice(0, 10)}.shbackup`, preview: await preview(snapshot) }
}

async function decodeBackup(file: Blob, password: string): Promise<Snapshot> {
  if (file.size > MAX_FILE_SIZE) throw new Error('ไฟล์สำรองใหญ่เกินขนาดที่รองรับ')
  let envelope: { header: Header; ciphertext: string }
  try { envelope = JSON.parse(await file.text()) } catch { throw new Error('รูปแบบไฟล์สำรองไม่ถูกต้อง') }
  const header = envelope?.header
  if (header?.formatVersion !== 1 || header.kdf !== 'PBKDF2-SHA256' || header.cipher !== 'AES-256-GCM' || header.iterations !== ITERATIONS || typeof envelope.ciphertext !== 'string') throw new Error('รูปแบบหรือเวอร์ชันไฟล์สำรองไม่รองรับ')
  try {
    const salt = unbytes(header.salt), iv = unbytes(header.iv)
    if (salt.length !== 16 || iv.length !== 12) throw Error('Invalid crypto parameters')
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(JSON.stringify(header)) }, await keyFor(password, salt), unbytes(envelope.ciphertext))
    return JSON.parse(decoder.decode(clear))
  } catch { throw new Error('รหัสสำรองไม่ถูกต้อง หรือไฟล์ถูกแก้ไข') }
}

function validateSnapshot(snapshot: Snapshot): void {
  if (snapshot?.formatVersion !== 1 || snapshot.schemaVersion > DATABASE_VERSION || !snapshot.stores || typeof snapshot.stores !== 'object' || !Array.isArray(snapshot.propertyIds)) throw new Error('Schema หรือ Format Version ไม่รองรับ')
  const propertyIds = new Set<string>()
  for (const entry of snapshot.stores.properties ?? []) {
    const record = entry.value as Record<string, unknown>
    validateId(record.id)
    if (record.propertyId !== record.id || entry.key !== record.id) throw Error('Property key ไม่ถูกต้อง')
    propertyIds.add(record.id)
  }
  const byStore = new Map<string, Map<string, Record<string, unknown>>>()
  for (const [name, entries] of Object.entries(snapshot.stores)) {
    if (!Array.isArray(entries)) throw Error('รายการข้อมูลไม่ถูกต้อง')
    const records = new Map<string, Record<string, unknown>>()
    for (const entry of entries) {
      rejectSensitive(entry.value, name)
      if (name === 'sync_queue') {
        const operation = entry.value as Record<string, unknown>
        validateId(operation.operationId)
        validateId(operation.propertyId)
        validateId(operation.entityId)
        if (entry.key !== operation.operationId || !propertyIds.has(String(operation.propertyId)) || !['pending', 'syncing', 'synced', 'conflict', 'failed'].includes(String(operation.status))) throw Error('Sync Queue ไม่ถูกต้อง')
        continue
      }
      if (name === 'workspaces') {
        if (typeof entry.key !== 'string' || !(/^(active-workspace|workspace:[0-9a-f-]+|(?:backup-)?server-property:[0-9a-f-]+|sync-room:[0-9a-f-]+:[0-9a-f-]+|backup-meta:last-saved)$/.test(entry.key))) throw Error('Workspace key ไม่ถูกต้อง')
        continue
      }
      const record = entry.value as Record<string, unknown>
      validateId(record.id)
      validateId(record.propertyId)
      if (entry.key !== record.id || !propertyIds.has(record.propertyId) || !Number.isSafeInteger(record.localRevision) || Number(record.localRevision) < 1 || Number(record.schemaVersion) > 1) throw Error('ข้อมูลข้ามที่พักหรือ revision ไม่ถูกต้อง')
      if (records.has(record.id)) throw Error('รายการซ้ำในไฟล์สำรอง')
      records.set(record.id, record)
      if (Object.hasOwn(fields, name)) {
        const input = Object.fromEntries(Object.keys(fields[name as Store]).filter(key => record[key] !== undefined).map(key => [key, record[key]]))
        validateInput(name as Store, input as never)
      }
    }
    byStore.set(name, records)
  }
  const relation = (store: string, field: string, parent: string) => {
    for (const record of byStore.get(store)?.values() ?? []) {
      const target = byStore.get(parent)?.get(String(record[field]))
      if (!target || target.propertyId !== record.propertyId) throw Error(`ความสัมพันธ์ ${store}.${field} ไม่ถูกต้อง`)
    }
  }
  for (const store of ['leases', 'meter_readings', 'bills', 'parcels', 'vehicles', 'repairs']) relation(store, 'unitId', 'units')
  relation('leases', 'residentId', 'residents')
  relation('bill_items', 'billId', 'bills')
  relation('payments', 'billId', 'bills')
  for (const bill of byStore.get('bills')?.values() ?? []) {
    const items = [...(byStore.get('bill_items')?.values() ?? [])].filter(item => item.billId === bill.id)
    const payments = [...(byStore.get('payments')?.values() ?? [])].filter(item => item.billId === bill.id)
    if (items.reduce((sum, item) => sum + Number(item.amountMinor), 0) !== bill.totalMinor || payments.reduce((sum, item) => sum + Number(item.amountMinor), 0) > Number(bill.totalMinor)) throw Error('ยอดบิลหรือยอดชำระไม่ถูกต้อง')
  }

}

async function preview(snapshot: Snapshot): Promise<BackupPreview> {
  const current = await readSnapshot()
  return {
    createdAt: snapshot.createdAt, schemaVersion: snapshot.schemaVersion, propertyIds: snapshot.propertyIds,
    counts: Object.fromEntries(Object.entries(snapshot.stores).map(([name, entries]) => [name, entries.length])),
    totalRecords: Object.values(snapshot.stores).reduce((sum, entries) => sum + entries.length, 0),
    currentDataIsNewer: Object.values(current.stores).flat().some(entry => {
      const updated = (entry.value as { updatedAt?: string })?.updatedAt
      return typeof updated === 'string' && Date.parse(updated) > Date.parse(snapshot.createdAt)
    }),
  }
}

export async function inspectBackup(file: Blob, password: string): Promise<BackupPreview> {
  const snapshot = await decodeBackup(file, password)
  validateSnapshot(snapshot)
  return preview(snapshot)
}

export async function restoreBackup(file: Blob, password: string, confirmed: boolean): Promise<BackupPreview> {
  if (!confirmed) throw Error('กรุณายืนยันการกู้คืน')
  const snapshot = await decodeBackup(file, password)
  validateSnapshot(snapshot)
  const db = await openLocalDB()
  const names = [...db.objectStoreNames]
  db.close()
  if (names.some(name => !(name in snapshot.stores)) || Object.keys(snapshot.stores).some(name => !names.includes(name))) throw Error('Object Stores ไม่ตรงกับฐานข้อมูลปัจจุบัน')
  const result = await preview(snapshot)
  const currentWorkspace = await withTransaction(['workspaces'], 'readonly', async tx => requestValue<string | undefined>(tx.objectStore('workspaces').get('active-workspace')))
  const restoredWorkspace = snapshot.stores.workspaces?.find(entry => entry.key === 'active-workspace')?.value
  if (currentWorkspace && currentWorkspace !== restoredWorkspace) throw Error('ไฟล์สำรองเป็นของพื้นที่ใช้งานอื่น ต้องใช้พื้นที่ที่ตรงกัน')
  const currentProperties = await withTransaction(['properties'], 'readonly', tx => requestValue<{ id: string }[]>(tx.objectStore('properties').getAll()))
  if (currentProperties.some(property => !snapshot.propertyIds.includes(property.id))) throw Error('ไฟล์สำรองไม่มีที่พักบางแห่งในเครื่องนี้')
  await withTransaction(names, 'readwrite', async tx => {
    for (const name of names) {
      const store = tx.objectStore(name)
      await requestValue(store.clear())
      for (const entry of snapshot.stores[name]) {
        const value = structuredClone(entry.value)
        if (name === 'sync_queue' && (value as { status: string }).status === 'syncing') (value as { status: string }).status = 'pending'
        if (name === 'workspaces' && typeof entry.key === 'string' && entry.key.startsWith('server-property:')) {
          await requestValue(store.add(value, `backup-${entry.key}`))
          continue
        }
        await requestValue(store.keyPath === null ? store.add(value, entry.key) : store.add(value))
      }
    }
  })
  return result
}

export async function recordBackupSaved(): Promise<void> {
  await withTransaction(['workspaces'], 'readwrite', async tx => {
    await requestValue(tx.objectStore('workspaces').put(new Date().toISOString(), 'backup-meta:last-saved'))
  })
}

export function lastBackupSaved(): Promise<string | undefined> {
  return withTransaction(['workspaces'], 'readonly', tx => requestValue(tx.objectStore('workspaces').get('backup-meta:last-saved')))
}

export async function localStorageSummary() {
  const snapshot = await readSnapshot()
  return { counts: Object.fromEntries(Object.entries(snapshot.stores).map(([name, entries]) => [name, entries.length])), pendingSync: (snapshot.stores.sync_queue ?? []).filter(entry => (entry.value as { status?: string }).status === 'pending').length, approximateBytes: encoder.encode(JSON.stringify(snapshot)).length }
}
