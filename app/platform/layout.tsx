import { ReactNode } from 'react'
import PlatformAuthGate from '../../components/PlatformAuthGate'
import { requirePlatformAdmin } from '../../lib/server-auth'

export default async function PlatformLayout({children}:{children:ReactNode}){
  await requirePlatformAdmin()
  return <PlatformAuthGate>{children}</PlatformAuthGate>
}
