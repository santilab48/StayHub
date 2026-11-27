'use client'

import { isAccommodationType, type AccommodationType } from './accommodation-types'
import { requestValue, withTransaction } from './local-db/connection'
import { ACTIVE_WORKSPACE, WORKSPACES, RECORD_SCHEMA_VERSION, type LocalRecord } from './local-db/schema'

/** Local-only onboarding workspace, never confused with a verified server account. */
export type DeviceWorkspace = {
  id: string
  ownerName: string
  dormName: string
  accommodationType?: AccommodationType
  createdAt: string
  version: 1
}
export async function createDeviceWorkspace(ownerName:string,dormName:string,accommodationType:AccommodationType='apartment'):Promise<DeviceWorkspace>{
  const owner=ownerName.trim().slice(0,80)
  const dorm=dormName.trim().slice(0,100)
  if(!owner||!dorm)throw new Error('กรุณากรอกชื่อและชื่อที่พัก')
  if(!isAccommodationType(accommodationType))throw new Error('ประเภทที่พักไม่ถูกต้อง')
  if(typeof crypto==='undefined'||!crypto.randomUUID)throw new Error('ต้องเปิดผ่าน HTTPS หรือ localhost')
  return withTransaction([WORKSPACES, 'properties'], 'readwrite', async tx => {
    const store = tx.objectStore(WORKSPACES)
    const active = await readActive(store)
    if (active?.ownerName === owner && active.dormName === dorm &&
        (active.accommodationType ?? 'apartment') === accommodationType) return active

    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const workspace: DeviceWorkspace = { id, ownerName: owner, dormName: dorm, accommodationType, createdAt, version: 1 }
    const property: LocalRecord<'properties'> = {
      id, propertyId: id, name: dorm, accommodationType, createdAt, updatedAt: createdAt,
      schemaVersion: RECORD_SCHEMA_VERSION, localRevision: 1,
    }
    await requestValue(tx.objectStore('properties').add(property))
    await requestValue(store.add(workspace, `workspace:${id}`))
    await requestValue(store.put(id, ACTIVE_WORKSPACE))
    return workspace
  })
}

async function readActive(store: IDBObjectStore): Promise<DeviceWorkspace | null> {
  const id: string | undefined = await requestValue(store.get(ACTIVE_WORKSPACE))
  if (!id) return null
  return await requestValue(store.get(`workspace:${id}`)) ?? null
}

export function getActiveWorkspace(): Promise<DeviceWorkspace | null> {
  return withTransaction([WORKSPACES], 'readonly', tx => readActive(tx.objectStore(WORKSPACES)))
}
