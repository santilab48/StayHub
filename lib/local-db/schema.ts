export const DATABASE_NAME = 'stayhub-device-v1'
export const DATABASE_VERSION = 2
export const RECORD_SCHEMA_VERSION = 1
export const WORKSPACES = 'workspaces'
export const ACTIVE_WORKSPACE = 'active-workspace'

type Field = 'text' | 'optionalText' | 'reading' | 'id' | 'money' | 'positiveMoney'

export const fields = {
  properties: { name: 'text', accommodationType: 'optionalText' },
  units: { name: 'text' },
  residents: { name: 'text' },
  leases: { unitId: 'id', residentId: 'id', startsOn: 'text', endsOn: 'optionalText' },
  meter_readings: { unitId: 'id', meter: 'text', reading: 'reading', readOn: 'text' },
  bills: { unitId: 'id', period: 'text', totalMinor: 'money' },
  bill_items: { billId: 'id', description: 'text', amountMinor: 'money' },
  payments: { billId: 'id', amountMinor: 'positiveMoney', paidOn: 'text' },
  announcements: { title: 'text', body: 'text' },
  parcels: { unitId: 'id', reference: 'text' },
  vehicles: { unitId: 'id', plate: 'text' },
  repairs: { unitId: 'id', title: 'text', status: 'text' },
  settings: { name: 'text', value: 'text' },
} as const satisfies Record<string, Record<string, Field>>

export type Store = keyof typeof fields
export type ReadStore = Store | 'change_log'
type Value<T> = T extends 'money' | 'positiveMoney' | 'reading' ? number : string
type Fields<T> = {
  [K in keyof T as T[K] extends 'optionalText' ? never : K]: Value<T[K]>
} & {
  [K in keyof T as T[K] extends 'optionalText' ? K : never]?: string
}

export interface RecordMetadata {
  id: string
  propertyId: string
  createdAt: string
  updatedAt: string
  schemaVersion: number
  localRevision: number
}

type StorePayloads = { [S in Store]: Fields<(typeof fields)[S]> }
export type RecordInput<S extends Store> = StorePayloads[S]

type RecordPayloads = StorePayloads & {
  change_log: { store: Store; recordId: string; operation: 'create' | 'update' | 'delete'; recordRevision: number }
}

export type LocalRecord<S extends ReadStore> = RecordMetadata & RecordPayloads[S]

export const searchFields = {
  properties: ['name'],
  units: ['name'],
  residents: ['name'],
  leases: ['unitId', 'residentId'],
  meter_readings: ['unitId', 'readOn'],
  bills: ['unitId', 'period'],
  bill_items: ['billId'],
  payments: ['billId'],
  announcements: ['title'],
  parcels: ['unitId', 'reference'],
  vehicles: ['unitId', 'plate'],
  repairs: ['unitId', 'status'],
  settings: ['name'],
  change_log: ['recordId'],
} as const satisfies Record<ReadStore, readonly string[]>

export function isId(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function validateId(value: unknown): asserts value is string {
  if (!isId(value)) throw new TypeError('Expected a UUID')
}

export function validateInput<S extends Store>(store: S, input: RecordInput<S>): void {
  const shape: Record<string, Field> = fields[store]
  if (!shape || !input || typeof input !== 'object' ||
      Object.keys(input).some(key => !Object.hasOwn(shape, key))) {
    throw new TypeError('Unexpected local record field')
  }
  const values = input as Record<string, unknown>
  for (const [key, field] of Object.entries(shape)) {
    const value = Object.hasOwn(values, key) ? values[key] : undefined
    const valid = field === 'id' ? isId(value)
      : field === 'money' || field === 'positiveMoney'
        ? typeof value === 'number' && Number.isSafeInteger(value) && value >= (field === 'positiveMoney' ? 1 : 0)
        : field === 'reading'
          ? typeof value === 'number' && Number.isFinite(value) && value >= 0
          : (field === 'optionalText' && value === undefined) ||
            (typeof value === 'string' && value.trim().length > 0)
    if (!valid) throw new TypeError(`Invalid ${store}.${key}`)
  }
}
