import {
  DATABASE_NAME, DATABASE_VERSION, RECORD_SCHEMA_VERSION, WORKSPACES,
  searchFields, validateId, validateInput, type LocalRecord, type ReadStore,
} from './schema'

export function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function upgrade(db: IDBDatabase, tx: IDBTransaction, oldVersion: number, report: (error: unknown) => void) {
  if (oldVersion < 1) db.createObjectStore(WORKSPACES)
  if (oldVersion < 3) {
    const queue = db.createObjectStore('sync_queue', { keyPath: 'operationId' })
    queue.createIndex('propertyId', 'propertyId')
  }
  if (oldVersion >= 2) return

  for (const name of Object.keys(searchFields) as ReadStore[]) {
    const store = db.createObjectStore(name, { keyPath: 'id' })
    store.createIndex('propertyId', 'propertyId')
    store.createIndex('byPropertyPage', ['propertyId', 'id'])
    for (const field of searchFields[name]) {
      store.createIndex(field, ['propertyId', field, 'id'])
    }
  }

  const cursorRequest = tx.objectStore(WORKSPACES).openCursor(IDBKeyRange.bound('workspace:', 'workspace;'))
  cursorRequest.onsuccess = () => {
    const cursor = cursorRequest.result
    if (!cursor) return
    try {
      const { id, dormName, accommodationType, createdAt, version } = cursor.value
      validateId(id)
      if (cursor.key !== `workspace:${id}` || version !== 1 ||
          typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt))) {
        throw new Error('Invalid legacy workspace')
      }
      const input = { name: dormName, accommodationType }
      validateInput('properties', input)
      const property: LocalRecord<'properties'> = {
        ...input, id, propertyId: id, createdAt, updatedAt: createdAt,
        schemaVersion: RECORD_SCHEMA_VERSION, localRevision: 1,
      }
      tx.objectStore('properties').add(property)
      cursor.continue()
    } catch (error) {
      report(error)
      tx.abort()
    }
  }
}

export function openLocalDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable'))

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    let blocked = false
    let upgradeError: unknown
    request.onupgradeneeded = event => {
      const tx = request.transaction!
      if (blocked) {
        tx.abort()
        return
      }
      try {
        upgrade(request.result, tx, event.oldVersion, error => { upgradeError = error })
      } catch (error) {
        upgradeError = error
        tx.abort()
      }
    }
    request.onblocked = () => {
      blocked = true
      reject(new Error('Close other StayHub tabs and try again'))
    }
    request.onerror = () => reject(upgradeError ?? request.error)
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => db.close()
      if (blocked) db.close()
      else resolve(db)
    }
  })
}

export async function withTransaction<T>(
  stores: string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const db = await openLocalDB()
  try {
    const tx = db.transaction(stores, mode)
    const done = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error ?? new Error('Local transaction aborted'))
    })
    // Observe an early abort even while the transaction callback is still pending.
    void done.catch(() => {})
    try {
      const result = await work(tx)
      await done
      return result
    } catch (error) {
      try { tx.abort() } catch { /* The transaction already ended. */ }
      await done.catch(() => {})
      throw error
    }
  } finally {
    db.close()
  }
}
