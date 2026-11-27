import {redirect} from 'next/navigation'
// Legacy page used an unconnected Supabase screen. Route owners to the
// authenticated PostgreSQL-backed Cloud workflow instead of inert controls.
export default function Page(){redirect('/cloud/billing')}
