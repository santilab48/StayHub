import { createBrowserClient } from '@supabase/ssr'

// Never silently connect to an unrelated project when configuration is absent.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function createSupabaseBrowser() {
  if (!url || !key) {
    throw new Error('Supabase public configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and a public key.')
  }
  return createBrowserClient(url, key)
}
