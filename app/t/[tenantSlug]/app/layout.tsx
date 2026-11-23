import {redirect} from 'next/navigation'
// The legacy resident subtree still contains Supabase prototype screens.
// Use the authenticated Cloud resident dashboard rather than expose inert controls.
export default function LegacyResidentLayout(){redirect('/my')}
