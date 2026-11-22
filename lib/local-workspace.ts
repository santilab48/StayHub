'use client'

import { accommodationTypes, isAccommodationType, type AccommodationType } from './accommodation-types'

/** Local-only onboarding workspace, never confused with a verified server account. */
export type DeviceWorkspace = {
  id: string
  ownerName: string
  dormName: string
  accommodationType?: AccommodationType
  createdAt: string
  version: 1
}
const DB_NAME='stayhub-device-v1'
const STORE='workspaces'
const ACTIVE='active-workspace'
function requestValue<T>(request:IDBRequest<T>):Promise<T>{
  return new Promise((resolve,reject)=>{
    request.onsuccess=()=>resolve(request.result)
    request.onerror=()=>reject(request.error??new Error('IndexedDB failed'))
  })
}
async function openDB():Promise<IDBDatabase>{
  if(typeof window==='undefined'||!('indexedDB' in window)) throw new Error('IndexedDB is unavailable')
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1)
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)
    }
    req.onsuccess=()=>resolve(req.result)
    req.onerror=()=>reject(req.error??new Error('Cannot open IndexedDB'))
    req.onblocked=()=>reject(new Error('Close other StayHub tabs and try again'))
  })
}
async function write(key:string,value:unknown):Promise<void>{
  const db=await openDB()
  try {
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite')
      tx.objectStore(STORE).put(value,key)
      tx.oncomplete=()=>resolve()
      tx.onerror=()=>reject(tx.error??new Error('Write failed'))
      tx.onabort=()=>reject(tx.error??new Error('Write aborted'))
    })
  } finally {db.close()}
}
async function read<T>(key:string):Promise<T|undefined>{
  const db=await openDB()
  try {
    const tx=db.transaction(STORE,'readonly')
    return await requestValue<T|undefined>(tx.objectStore(STORE).get(key))
  } finally {db.close()}
}
export async function createDeviceWorkspace(ownerName:string,dormName:string,accommodationType:AccommodationType='apartment'):Promise<DeviceWorkspace>{
  const owner=ownerName.trim().slice(0,80)
  const dorm=dormName.trim().slice(0,100)
  if(!owner||!dorm)throw new Error('กรุณากรอกชื่อและชื่อที่พัก')
  if(!isAccommodationType(accommodationType))throw new Error('ประเภทที่พักไม่ถูกต้อง')
  if(typeof crypto==='undefined'||!crypto.randomUUID)throw new Error('ต้องเปิดผ่าน HTTPS หรือ localhost')
  const workspace:DeviceWorkspace={id:crypto.randomUUID(),ownerName:owner,dormName:dorm,accommodationType,createdAt:new Date().toISOString(),version:1}
  await write('workspace:'+workspace.id,workspace)
  await write(ACTIVE,workspace.id)
  return workspace
}
export async function getActiveWorkspace():Promise<DeviceWorkspace|null>{
  const id=await read<string>(ACTIVE)
  if(!id)return null
  return await read<DeviceWorkspace>('workspace:'+id)??null
}
