import { requestValue, withTransaction } from './connection'
import {
  RECORD_SCHEMA_VERSION, WORKSPACES, fields, searchFields, validateId, validateInput,
  type LocalRecord, type ReadStore, type RecordInput, type RecordMetadata, type Store,
} from './schema'

export { openLocalDB } from './connection'
export type { LocalRecord, ReadStore, RecordInput, Store } from './schema'

type FilterField<S extends ReadStore> = (typeof searchFields)[S][number]

interface ListOptions<S extends ReadStore> {
  limit?: number
  afterId?: string
  where?: { field: FilterField<S>; equals: string }
}

type WriteOptions = { id?: never; expectedRevision?: never } | { id: string; expectedRevision: number }

export class LocalRevisionConflict extends Error {
  constructor() {
    super('The local record changed. Read its current revision before retrying.')
    this.name = 'LocalRevisionConflict'
  }
}

export function getLocalDatabaseVersion(): Promise<number> {
  return withTransaction([WORKSPACES], 'readonly', async tx => tx.db.version)
}

async function get<S extends ReadStore>(tx: IDBTransaction, store: S, propertyId: string, id: string) {
  validateId(propertyId)
  validateId(id)
  const record: LocalRecord<S> | undefined = await requestValue(tx.objectStore(store).get(id))
  return record?.propertyId === propertyId ? record : undefined
}

export function getLocalRecord<S extends ReadStore>(store: S, propertyId: string, id: string) {
  return withTransaction([store], 'readonly', tx => get(tx, store, propertyId, id))
}

function range(prefix: string[], afterId?: string) {
  if (afterId !== undefined) validateId(afterId)
  return IDBKeyRange.bound(afterId === undefined ? prefix : [...prefix, afterId], [...prefix, []], afterId !== undefined, true)
}

export function listLocalRecords<S extends ReadStore>(
  store: S, propertyId: string, options: ListOptions<S> = {},
): Promise<{ records: LocalRecord<S>[]; nextCursor?: string }> {
  const { limit = 100, afterId, where } = options
  return withTransaction([store], 'readonly', async tx => {
    validateId(propertyId)
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new RangeError('Limit must be between 1 and 500')
    const objectStore = tx.objectStore(store)
    let index = objectStore.index('byPropertyPage')
    const prefix = [propertyId]
    if (where) {
      if (!(searchFields[store] as readonly string[]).includes(where.field) || typeof where.equals !== 'string') {
        throw new TypeError('Invalid local record filter')
      }
      index = objectStore.index(where.field)
      prefix.push(where.equals)
    }
    const records: LocalRecord<S>[] = await requestValue(index.getAll(range(prefix, afterId), limit + 1))
    if (records.length <= limit) return { records }
    records.pop()
    return { records, nextCursor: records.at(-1)!.id }
  })
}

export interface LocalTransaction {
  get: <S extends ReadStore>(store: S, id: string) => Promise<LocalRecord<S> | undefined>
  put: <S extends Store>(store: S, input: RecordInput<S>, options?: WriteOptions) => Promise<LocalRecord<S>>
  delete: (store: Store, id: string, expectedRevision: number) => Promise<void>
  list: <S extends ReadStore>(store: S) => Promise<LocalRecord<S>[]>
}

const stores = Object.keys(searchFields) as ReadStore[]

function requireRevision(record: LocalRecord<ReadStore> | undefined, revision: number) {
  if (!record || !Number.isSafeInteger(revision) || record.localRevision !== revision) {
    throw new LocalRevisionConflict()
  }
}

function sumMoney(rows: { amountMinor: number }[]) {
  const total = rows.reduce((sum, row) => sum + row.amountMinor, 0)
  if (!Number.isSafeInteger(total)) throw new RangeError('Local bill amount exceeds the supported range')
  return total
}

/**
 * The callback may await operations on the supplied transaction. Keep unrelated
 * I/O outside the callback so the IndexedDB write lock is held only for local work.
 */
export function runLocalTransaction<T>(propertyId: string, work: (tx: LocalTransaction) => Promise<T>): Promise<T> {
  return withTransaction([...stores, WORKSPACES], 'readwrite', async tx => {
    validateId(propertyId)
    const billsToCheck = new Set<string>()
    let working = true
    // Prevent a callback that rejects after yielding to another task from silently
    // committing earlier writes. IndexedDB operations still require an active task.
    function keepAlive() {
      if (working) tx.objectStore('properties').get(propertyId).onsuccess = keepAlive
    }
    keepAlive()
    try {
      const read: LocalTransaction['get'] = (store, id) => get(tx, store, propertyId, id)
      const trackBill = (store: Store, record: RecordMetadata & { billId?: string }) => {
        if (store === 'bills') billsToCheck.add(record.id)
        if (record.billId) billsToCheck.add(record.billId)
      }

      async function log(store: Store, record: RecordMetadata, operation: 'create' | 'update' | 'delete') {
        const now = new Date().toISOString()
        const entry: LocalRecord<'change_log'> = {
          id: crypto.randomUUID(), propertyId, createdAt: now, updatedAt: now,
          schemaVersion: RECORD_SCHEMA_VERSION, localRevision: 1,
          store, recordId: record.id, operation, recordRevision: record.localRevision,
        }
        await requestValue(tx.objectStore('change_log').add(entry))
      }

      async function put<S extends Store>(
        store: S, input: RecordInput<S>, options: WriteOptions = {},
      ): Promise<LocalRecord<S>> {
        if (!Object.hasOwn(fields, store)) throw new TypeError('Invalid writable local store')
        validateInput(store, input)
        const { id: existingId, expectedRevision } = options
        const id = existingId ?? (store === 'properties' ? propertyId : crypto.randomUUID())
        const previous = existingId === undefined ? undefined : await read(store, id)
        if (existingId !== undefined) requireRevision(previous, expectedRevision!)
        if (store !== 'properties' && !await read('properties', propertyId)) {
          throw new Error('Local property does not exist')
        }
        const now = new Date().toISOString()
        const record = {
          ...input, id, propertyId, createdAt: previous?.createdAt ?? now,
          updatedAt: now, schemaVersion: RECORD_SCHEMA_VERSION,
          localRevision: (previous?.localRevision ?? 0) + 1,
        }
        const objectStore = tx.objectStore(store)
        await requestValue(previous ? objectStore.put(record) : objectStore.add(record))
        if (previous) trackBill(store, previous)
        trackBill(store, record)
        await log(store, record, previous ? 'update' : 'create')
        return record as LocalRecord<S>
      }

      const remove: LocalTransaction['delete'] = async (store, id, revision) => {
        if (!Object.hasOwn(fields, store)) throw new TypeError('Invalid writable local store')
        const record = await read(store, id)
        requireRevision(record, revision)
        if (store === 'properties') {
          if (await requestValue(tx.objectStore(WORKSPACES).getKey(`workspace:${id}`)) !== undefined) {
            throw new Error('This property belongs to a device workspace')
          }
          for (const child of stores) {
            if (child === 'properties' || child === 'change_log') continue
            if (await requestValue(tx.objectStore(child).index('propertyId').getKey(propertyId)) !== undefined) {
              throw new Error('Cannot delete a property with records')
            }
          }
        }
        if (store === 'units' &&
            await requestValue(tx.objectStore('bills').index('unitId').getKey(range([propertyId, id]))) !== undefined) {
          throw new Error('Cannot delete a unit with bills')
        }
        await requestValue(tx.objectStore(store).delete(id))
        trackBill(store, record!)
        await log(store, record!, 'delete')
      }

      // Serialize operations even when the caller uses Promise.all. Revision checks
      // and writes on the same record must never interleave inside one transaction.
      let acceptingRequests = true
      let pending = Promise.resolve<unknown>(undefined)
      function enqueue<R>(op: () => Promise<R>): Promise<R> {
        if (!working || !acceptingRequests) return Promise.reject(new Error('Local transaction has ended'))
        const result = pending.then(op)
        pending = result
        void result.catch(() => {})
        return result
      }
      const result = await work({
        get: (store, id) => enqueue(() => read(store, id)),
        put: (store, input, options) => enqueue(() => put(store, input, options)),
        delete: (store, id, revision) => enqueue(() => remove(store, id, revision)),
        list: store => enqueue(() => requestValue(tx.objectStore(store).index('propertyId').getAll(propertyId))),
      })
      acceptingRequests = false
      await pending
      for (const billId of billsToCheck) {
        const bill = await read('bills', billId)
        const match = range([propertyId, billId])
        const items: LocalRecord<'bill_items'>[] = await requestValue(tx.objectStore('bill_items').index('billId').getAll(match))
        const payments: LocalRecord<'payments'>[] = await requestValue(tx.objectStore('payments').index('billId').getAll(match))
        if (!bill) {
          if (items.length || payments.length) throw new Error('Bill items and payments require a bill in the same property')
        } else if (!await read('units', bill.unitId) || bill.totalMinor !== sumMoney(items) || sumMoney(payments) > bill.totalMinor) {
          throw new Error('Bill requires a local unit, a matching item total and payments within that total')
        }
      }
      return result
    } finally {
      working = false
    }
  })
}

export function putLocalRecord<S extends Store>(store: S, propertyId: string, input: RecordInput<S>, options?: WriteOptions) {
  return runLocalTransaction(propertyId, tx => tx.put(store, input, options))
}

export function deleteLocalRecord(store: Store, propertyId: string, id: string, expectedRevision: number) {
  return runLocalTransaction(propertyId, tx => tx.delete(store, id, expectedRevision))
}
