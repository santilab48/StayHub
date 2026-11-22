import { ReactNode } from 'react'
import PlatformAuthGate from '../../components/PlatformAuthGate'
import { requirePlatformAdmin } from '../../lib/server-auth'

// Platform authorization requires request cookies and must never be prerendered.
export const dynamic = 'force-dynamic'

export default async function PlatformLayout({children}:{children:ReactNode}){
  await requirePlatformAdmin()
  return <PlatformAuthGate>{children}</PlatformAuthGate>
}
