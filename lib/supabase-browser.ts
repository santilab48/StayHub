import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exqsiwvmjyzkkydfdhby.supabase.co'
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_ssBp33CUhUN0K5JNjy-71g_MXBtoNIx'

export function createSupabaseBrowser(){
  return createBrowserClient(url, key)
}
