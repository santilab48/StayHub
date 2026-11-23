import {redirect} from 'next/navigation'
// All legacy tenant-admin screens depend on the old Supabase project.
// They must never load or create records alongside the Neon Cloud database.
// /cloud verifies the StayHub session and property membership before operations.
export default function AdminLayout(){redirect('/cloud')}
