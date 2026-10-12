import { createClient } from '@supabase/supabase-js'

// Publika värden – publishable-nyckeln är gjord för att ligga i webbläsaren.
export const SUPABASE_URL = 'https://zqdccfjisvkovuikrick.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_XZ_29jr--wX3ogJWcfHtzg_Akysk87J'
export const IMAGE_BUCKET = 'item-images'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
}
