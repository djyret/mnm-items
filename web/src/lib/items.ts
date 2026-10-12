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
  icon_path: null,
  holder_id: null,
  status: 'ledig',
  lent_to_id: null,
  sold_to: null,
  price_cp: null,
  sold_price_cp: null,
  game_link: null,
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

export async function uploadImage(blob: Blob, suffix = ''): Promise<string> {
  const path = `${crypto.randomUUID()}${suffix}.webp`
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, {
    contentType: 'image/webp',
    cacheControl: '31536000',
  })
  if (error) throw new Error(`Uppladdning misslyckades: ${error.message}`)
  return path
}

export async function deleteImages(...paths: (string | null)[]) {
  const list = paths.filter((p): p is string => !!p)
  if (list.length) await supabase.storage.from(IMAGE_BUCKET).remove(list)
}

/** Klipper ut ikonen ur screenshoten: kvadratisk ruta med marginal runt modellens box. */
export async function cropIcon(image: Blob, box: NonNullable<ParsedItem['icon_box']>, size = 96): Promise<Blob> {
  const bmp = await createImageBitmap(image)
  const side = Math.max(box.width, box.height) * 1.35
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const sx = Math.max(0, Math.min(bmp.width - side, cx - side / 2))
  const sy = Math.max(0, Math.min(bmp.height - side, cy - side / 2))
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  canvas.getContext('2d')!.drawImage(bmp, sx, sy, side, side, 0, 0, size, size)
  bmp.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Kunde inte klippa ikonen'))), 'image/webp', 0.9),
  )
}

/** Skickar bilden till Edge Function parse-item (Claude Haiku). */
export async function parseImage(blob: Blob): Promise<ParsedItem> {
  const bmp = await createImageBitmap(blob)
  const { width, height } = bmp
  bmp.close()
  const res = await fetch(`${SUPABASE_URL}/functions/v1/parse-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
    body: JSON.stringify({ image: await blobToBase64(blob), media_type: blob.type || 'image/webp', width, height }),
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
