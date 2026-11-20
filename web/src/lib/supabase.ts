import { createClient } from '@supabase/supabase-js'

// Publika värden – publishable-nyckeln är gjord för att ligga i webbläsaren.
export const SUPABASE_URL = 'https://zqdccfjisvkovuikrick.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_XZ_29jr--wX3ogJWcfHtzg_Akysk87J'
export const IMAGE_BUCKET = 'item-images'

// PKCE: inloggningssvaret kommer som ?code=… i query-strängen i stället för #access_token=…,
// så det krockar inte med HashRouter.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true },
})

export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
}
