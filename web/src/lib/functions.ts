import { SUPABASE_KEY, SUPABASE_URL, supabase } from './supabase'

// Gängordet låg här förut; städa bort det ur webbläsaren
try {
  localStorage.removeItem('mnm:gangord')
} catch {
  /* privat läge */
}

/**
 * Anropar en Edge Function som den inloggade användaren. Funktionen kontrollerar själv
 * att man är redaktör och har kvot kvar, och svarar med ett begripligt fel annars.
 */
export async function callFunction<T>(name: string, payload: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Logga in med Discord för att använda AI-funktionerna.')

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `${name} svarade inte (${res.status})`)
  return body as T
}
