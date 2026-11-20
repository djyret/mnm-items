// Kontrollerar att en besökare (ej inloggad) kan läsa men inte skriva. Kör: node scripts/check-access.mjs
// Testerna lämnar inga spår: insert skickar tomma rader som ändå bryter not null, update/delete riktas mot
// ett id som inte finns, och en uppladdning som mot förmodan lyckas raderas direkt.
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../web/src/lib/supabase.ts', import.meta.url), 'utf8')
const URL_ = src.match(/SUPABASE_URL = '([^']+)'/)[1]
const KEY = src.match(/SUPABASE_KEY = '([^']+)'/)[1]
const H = { apikey: KEY, 'Content-Type': 'application/json' }
const NONE = '00000000-0000-0000-0000-000000000000'

const TABLES = ['characters', 'items', 'item_events', 'wishlist', 'chronicle_chapters', 'chronicle_entries', 'chronicle_cast', 'chronicle_settings']
const BUCKETS = ['item-images', 'kronikan']
const FUNCTIONS = ['parse-item', 'berattelse', 'seriebild']

let failed = 0
const check = (label, pass, detail = '') => {
  if (!pass) failed++
  console.log(`${pass ? 'OK  ' : 'FEL '} ${label}${detail ? ` – ${detail}` : ''}`)
}
const denied = async (res) => {
  const body = await res.json().catch(() => ({}))
  return { ok: res.status === 401 || res.status === 403 || body.code === '42501', detail: `${res.status} ${body.code ?? ''} ${body.message ?? ''}`.trim() }
}

for (const t of TABLES) {
  const key = t === 'chronicle_settings' ? 'key' : 'id'
  const read = await fetch(`${URL_}/rest/v1/${t}?select=${key}&limit=1`, { headers: H })
  check(`${t}: läsa`, read.ok, String(read.status))

  const ins = await denied(await fetch(`${URL_}/rest/v1/${t}`, { method: 'POST', headers: H, body: '{}' }))
  check(`${t}: insert nekas`, ins.ok, ins.detail)
  // Tom kropp ({}) kör ingen SQL alls och ger 204, så skicka en riktig kolumn (riktad mot ett id som inte finns)
  const upd = await denied(await fetch(`${URL_}/rest/v1/${t}?${key}=eq.${NONE}`, { method: 'PATCH', headers: H, body: JSON.stringify({ [key]: NONE }) }))
  check(`${t}: update nekas`, upd.ok, upd.detail)
  const del = await denied(await fetch(`${URL_}/rest/v1/${t}?${key}=eq.${NONE}`, { method: 'DELETE', headers: H }))
  check(`${t}: delete nekas`, del.ok, del.detail)
}

for (const b of BUCKETS) {
  const path = `__access-check__/${Date.now()}.txt`
  const res = await fetch(`${URL_}/storage/v1/object/${b}/${path}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'text/plain' },
    body: 'test',
  })
  check(`${b}: uppladdning nekas`, !res.ok, String(res.status))
  if (res.ok) {
    await fetch(`${URL_}/storage/v1/object/${b}/${path}`, { method: 'DELETE', headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  }
}

for (const f of FUNCTIONS) {
  const res = await fetch(`${URL_}/functions/v1/${f}`, { method: 'POST', headers: H, body: '{}' })
  const body = await res.json().catch(() => ({}))
  check(`${f}: kräver inloggning`, res.status === 401 && body.code === 'auth', `${res.status} ${body.code ?? ''}`)
}

const rpc = await denied(await fetch(`${URL_}/rest/v1/rpc/ai_usage_start`, { method: 'POST', headers: H, body: '{"fn":"seriebild"}' }))
check('ai_usage_start: nekas', rpc.ok, rpc.detail)
const equip = await denied(await fetch(`${URL_}/rest/v1/rpc/equip_item`, { method: 'POST', headers: H, body: JSON.stringify({ p_item: NONE, p_slot: 'HEAD' }) }))
check('equip_item: nekas', equip.ok, equip.detail)
const area = await denied(await fetch(`${URL_}/rest/v1/area_access?area=eq.forradet`, { method: 'PATCH', headers: H, body: '{"min_role":"visitor"}' }))
check('area_access: ändring nekas', area.ok, area.detail)
const mem = await denied(await fetch(`${URL_}/rest/v1/memberships?select=user_id`, { headers: H }))
check('memberships: läsning nekas', mem.ok, mem.detail)

console.log(failed ? `\n${failed} kontroller misslyckades.` : '\nAlla kontroller gick igenom.')
process.exit(failed ? 1 : 0)
