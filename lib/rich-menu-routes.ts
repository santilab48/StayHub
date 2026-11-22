import { stayhubRoutes } from './routes'

/**
 * LINE Rich Menu destination registry.
 * Only allowlisted actions can redirect. Never accept arbitrary return URLs.
 * Authorization MUST remain at each destination and in Supabase RLS.
 */
export const richMenuActions = {
  home: { label: 'หน้าหลัก', audience: 'resident' },
  room: { label: 'ห้องของฉัน', audience: 'resident' },
  billing: { label: 'บิลและชำระเงิน', audience: 'resident' },
  repair: { label: 'แจ้งซ่อม', audience: 'resident' },
  parcels: { label: 'พัสดุและบริการ', audience: 'resident' },
  news: { label: 'ข่าวประกาศ', audience: 'resident' },
  contact: { label: 'ติดต่อหอพัก', audience: 'resident' },
  admin: { label: 'ภาพรวมเจ้าของหอ', audience: 'admin' },
  admin_billing: { label: 'การเงินและบิล', audience: 'admin' },
  admin_repairs: { label: 'จัดการงานซ่อม', audience: 'admin' },
  admin_rooms: { label: 'จัดการห้องพัก', audience: 'admin' },
  admin_parcels: { label: 'จัดการพัสดุ', audience: 'admin' },
  admin_news: { label: 'จัดการข่าวสาร', audience: 'admin' },
} as const

export type RichMenuAction = keyof typeof richMenuActions

export function isValidTenantSlug(slug: string): boolean {
  // Only ASCII letters, digits, underscore and hyphen; reject encoded paths.
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/.test(slug)
}

export function isRichMenuAction(action: string): action is RichMenuAction {
  return Object.prototype.hasOwnProperty.call(richMenuActions, action)
}

export function richMenuTarget(tenantSlug: string, action: string): string | null {
  if (!isValidTenantSlug(tenantSlug) || !isRichMenuAction(action)) return null
  const r = stayhubRoutes
  const targets: Record<RichMenuAction, string> = {
    home: r.resident.home(tenantSlug),
    room: r.resident.room(tenantSlug),
    billing: r.resident.billing(tenantSlug),
    repair: r.resident.repairs(tenantSlug),
    parcels: r.resident.services(tenantSlug), // parcels have no dedicated resident page yet
    news: r.resident.news(tenantSlug),
    contact: r.resident.services(tenantSlug), // contact needs dedicated implementation
    admin: r.admin.home(tenantSlug),
    admin_billing: r.admin.finance(tenantSlug),
    admin_repairs: r.admin.repairs(tenantSlug),
    admin_rooms: r.admin.rooms(tenantSlug),
    admin_parcels: r.admin.parcels(tenantSlug),
    admin_news: r.admin.news(tenantSlug),
  }
  return targets[action]
}

/** Each OA must use its assigned tenant slug, never a user-supplied tenant ID. */
export function richMenuEntryPath(tenantSlug: string, action: RichMenuAction): string {
  if (!isValidTenantSlug(tenantSlug)) throw new Error('Invalid tenant slug')
  return `/t/${tenantSlug}/menu/${action}`
}
