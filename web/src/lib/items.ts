import { STAT_GROUPS, normalizeStatKey } from './constants'
import { IMAGE_BUCKET, SUPABASE_KEY, SUPABASE_URL, supabase } from './supabase'
import type { Character, Item, ItemDraft, ParsedItem } from './types'

export const emptyDraft = (): ItemDraft => ({
  name: '',
  flags: [],
  slots: [],
  ac: null,
  stats: {},
  effect: null,
  description: null,
  weight: null,
  size: null,
  classes: [],
  races: [],
  extra_lines: [],
  image_path: null,
  holder_id: null,
  status: 'ledig',
  lent_to_id: null,
  sold_to: null,
  notes: null,
})

export function parsedToDraft(p: ParsedItem, base: ItemDraft): ItemDraft {
  const stats: Record<string, number> = {}
  for (const s of p.stats) stats[normalizeStatKey(s.key)] = s.value
  const up = (xs: string[]) => xs.map((x) => x.trim().toUpperCase()).filter(Boolean)
  return {
    ...base,
    name: p.name.trim(),
    flags: up(p.flags),
    slots: up(p.slots),
    ac: p.ac,
    stats,
    effect: p.effect,
    description: p.description,
    weight: p.weight,
    size: p.size ? p.size.toUpperCase() : null,
    classes: up(p.classes),
    races: up(p.races),
    extra_lines: p.extra_lines,
  }
}

export const isNoDrop = (i: Pick<Item, 'flags'>) =>
  i.flags.some((f) => f === 'NODROP' || f === 'NO DROP' || f === 'NOTRADE')

/** Kan karaktären bära itemet? Okänd klass/ras räknas som ja. */
export function canUse(item: Pick<Item, 'classes' | 'races'>, c: Character): boolean {
  const cls = c.class?.toUpperCase()
  const classOk =
    !cls || item.classes.length === 0 || item.classes.includes('ALL') || item.classes.includes(cls)
  const race = c.race?.toUpperCase()
  const raceOk =
    !race ||
    item.races.length === 0 ||
    item.races.includes('ALL') ||
    item.races.some((r) => r === race || race.startsWith(r) || r.startsWith(race.slice(0, 3)))
  return classOk && raceOk
}

/** Grov poäng för sortering: AC + summa av attribut + HP/Mana delat. */
export function itemScore(i: Item): number {
  const s = i.stats
  const attrs = STAT_GROUPS[0].reduce((sum, k) => sum + (s[k] ?? 0), 0)
  return (i.ac ?? 0) + attrs * 2 + ((s.HP ?? 0) + (s.MANA ?? 0)) / 5
}

// ---------- Bilder ----------

/** Skalar ner och konverterar till WebP för att spara lagring. */
export async function compressImage(file: Blob, maxWidth = 1400): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bmp.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Kunde inte konvertera bilden'))), 'image/webp', 0.88),
  )
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(bin)
}

export async function uploadImage(blob: Blob): Promise<string> {
  const path = `${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, {
    contentType: 'image/webp',
    cacheControl: '31536000',
  })
  if (error) throw new Error(`Uppladdning misslyckades: ${error.message}`)
  return path
}

export async function deleteImage(path: string | null) {
  if (path) await supabase.storage.from(IMAGE_BUCKET).remove([path])
}

/** Skickar bilden till Edge Function parse-item (Claude Haiku). */
export async function parseImage(blob: Blob): Promise<ParsedItem> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
    body: JSON.stringify({ image: await blobToBase64(blob), media_type: blob.type || 'image/webp' }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `Avläsning misslyckades (${res.status})`)
  return body.item as ParsedItem
}

// ---------- Händelser ----------

export async function logEvent(
  item_id: string,
  kind: string,
  opts: { from_id?: string | null; to_id?: string | null; note?: string | null } = {},
) {
  await supabase.from('item_events').insert({ item_id, kind, ...opts })
}
