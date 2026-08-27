import { ReactNode } from 'react'
import PlatformAuthGate from '../../components/PlatformAuthGate'

export default function PlatformLayout({children}:{children:ReactNode}){
  return <PlatformAuthGate>{children}</PlatformAuthGate>
}
