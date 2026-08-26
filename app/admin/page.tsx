import { redirect } from 'next/navigation'

export default function LegacyAdmin(){
  // Tenant admin must always enter through /t/{tenantSlug}/admin so every action has an explicit OA boundary.
  redirect('/')
}
