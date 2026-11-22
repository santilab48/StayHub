import { notFound, redirect } from 'next/navigation'
import { richMenuTarget } from '../../../../../lib/rich-menu-routes'

export default async function RichMenuEntry({
  params,
}: {
  params: Promise<{ tenantSlug: string; action: string }>
}) {
  const { tenantSlug, action } = await params
  const target = richMenuTarget(tenantSlug, action)
  if (!target) notFound()

  // Entry-point routing only. Destination authentication, role authorization
  // and tenant-scoped RLS are required before accessing private records.
  redirect(target)
}
