'use client'

/**
 * Local-only draft storage. Not a source of truth for shared records.
 * Never store auth tokens, ID cards, signatures, slips or other sensitive files.
 */
export type LocalDraftScope = {
  tenantId: string
  userId: string
}
export type RepairDraft = {
  category: string
  detail: string
  updatedAt: string
}

const DB_NAME = 'stayhub-local-v1'
const VERSION = 1
const STORE = 'drafts'
const scopeKey = (scope:LocalDraftScope, type:string):string =>
  JSON.stringify([scope.tenantId,scope.userId,type])

function requestPromise<T>(request:IDBRequest<T>):Promise<T> {
  return new Promise((resolve,reject)=>{
    request.onsuccess=()=>resolve(request.result)
    request.onerror=()=>reject(request.error||new Error('IndexedDB request failed'))
  })
}

function openDatabase():Promise<IDBDatabase> {
  if(typeof window==='undefined'||!('indexedDB' in window))
    return Promise.reject(new Error('IndexedDB unavailable'))
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,VERSION)
    request.onupgradeneeded=()=>{
      const db=request.result
      if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)
    }
    request.onsuccess=()=>resolve(request.result)
    request.onerror=()=>reject(request.error||new Error('Cannot open local storage'))
    request.onblocked=()=>reject(new Error('Local storage upgrade blocked by another tab'))
  })
}

async function transact<T>(mode:IDBTransactionMode,run:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T> {
  const db=await openDatabase()
  try{
    const tx=db.transaction(STORE,mode)
    const result=requestPromise(run(tx.objectStore(STORE)))
    const complete=new Promise<void>((resolve,reject)=>{
      tx.oncomplete=()=>resolve()
      tx.onerror=()=>reject(tx.error||new Error('Local storage transaction failed'))
      tx.onabort=()=>reject(tx.error||new Error('Local storage transaction aborted'))
    })
    const [value]=await Promise.all([result,complete])
    return value
  }finally{db.close()}
}

export async function getRepairDraft(scope:LocalDraftScope):Promise<RepairDraft|null> {
  const value=await transact<RepairDraft|undefined>('readonly',store=>store.get(scopeKey(scope,'repair')))
  return value??null
}

export async function saveRepairDraft(scope:LocalDraftScope,category:string,detail:string):Promise<void> {
  // Keep only small text drafts. Do not persist images in this store.
  const draft:RepairDraft={category:category.slice(0,100),detail:detail.slice(0,10000),updatedAt:new Date().toISOString()}
  await transact<IDBValidKey>('readwrite',store=>store.put(draft,scopeKey(scope,'repair')))
}

export async function clearRepairDraft(scope:LocalDraftScope):Promise<void> {
  await transact<undefined>('readwrite',store=>store.delete(scopeKey(scope,'repair')))
}

/** Remove only local drafts for a specific user/tenant; never clear another user's records. */
export async function clearUserDrafts(scope:LocalDraftScope):Promise<void> {
  const db=await openDatabase()
  try {
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite')
      const request=tx.objectStore(STORE).openCursor()
      request.onsuccess=()=>{
        const cursor=request.result
        if(!cursor)return
        const key=String(cursor.key)
        try{
          const parsed=JSON.parse(key) as unknown
          if(Array.isArray(parsed)&&parsed[0]===scope.tenantId&&parsed[1]===scope.userId)cursor.delete()
        }catch{ /* Ignore nonconforming keys. */ }
        cursor.continue()
      }
      request.onerror=()=>reject(request.error||new Error('Draft enumeration failed'))
      tx.oncomplete=()=>resolve()
      tx.onerror=()=>reject(tx.error||new Error('Draft removal failed'))
      tx.onabort=()=>reject(tx.error||new Error('Draft removal aborted'))
    })
  }finally{db.close()}
}
