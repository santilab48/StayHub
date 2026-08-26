export type TenantStatus = 'active' | 'suspended' | 'inactive'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled'
export type TenantRole = 'tenant' | 'staff' | 'admin' | 'owner'

export function canUseTenantApp(input: {
  tenantStatus: TenantStatus
  subscriptionStatus: SubscriptionStatus
  graceUntil?: Date | null
  now?: Date
}) {
  const now = input.now ?? new Date()
  if (input.tenantStatus !== 'active') return false
  if (input.subscriptionStatus === 'trial' || input.subscriptionStatus === 'active') return true
  if (input.subscriptionStatus === 'past_due' && input.graceUntil && input.graceUntil >= now) return true
  return false
}

export function canUseTenantAdmin(role: TenantRole) {
  return role === 'staff' || role === 'admin' || role === 'owner'
}

export function assertSameTenant(routeTenantId: string, recordTenantId: string) {
  if (routeTenantId !== recordTenantId) throw new Error('TENANT_BOUNDARY_VIOLATION')
}

export function tenantStoragePath(tenantId: string, entityId: string, filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${tenantId}/${entityId}/${safe}`
}
