import { redirect } from 'next/navigation'

// Legacy Supabase demo sign-in is retired. The Cloud owner flow uses
// server-verified PostgreSQL sessions at /cloud.
export default function SetupOwnerPage() {
  redirect('/cloud')
}
