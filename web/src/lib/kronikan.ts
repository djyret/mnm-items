import { compressImage } from './items'
import { SUPABASE_KEY, SUPABASE_URL, supabase } from './supabase'
import type { CastMember, Chapter, Entry, EntryKind, Quote } from './types'

export const KRONIKA_BUCKET = 'kronikan'

export const KIND_LABELS: Record<EntryKind, string> = {
  serie: 'Seriebild',
  skarmdump: 'Skärmdump',
  anteckning: 'Anteckning',
  klipp: 'Klipp',
}

export const ROLE_LABELS: Record<CastMember['role'], string> = {
  hjalte: 'Hjälte',
  husdjur: 'Husdjur',
  npc: 'NPC / fiende',
}

export function kronikaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from(KRONIKA_BUCKET).getPublicUrl(path).data.publicUrl
}

export async function uploadKronika(blob: Blob): Promise<string> {
  const path = `${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from(KRONIKA_BUCKET).upload(path, blob, {
    contentType: 'image/webp',
    cacheControl: '31536000',
  })
  if (error) throw new Error(`Uppladdning misslyckades: ${error.message}`)
  return path
}

export async function deleteKronika(...paths: (string | null)[]) {
  const list = paths.filter((p): p is string => !!p)
  if (list.length) await supabase.storage.from(KRONIKA_BUCKET).remove(list)
}

/**
 * ChatGPT levererar 1536×1024, 1024×1536 eller 1024×1024; spelets skärmdumpar är
 * nästan alltid 16:9 eller fritt beskurna. Gissningen går att ändra efteråt.
 */
export function guessKind(width: number, height: number): EntryKind {
  const sizes = [[1536, 1024], [1024, 1536], [1024, 1024]]
  return sizes.some(([w, h]) => Math.abs(width / height - w / h) < 0.01 && Math.max(width, height) <= 2048)
    ? 'serie'
    : 'skarmdump'
}

/** Skalar ner bilden och laddar upp den. Returnerar sökväg och gissad typ. */
export async function storeImage(file: Blob): Promise<{ path: string; kind: EntryKind }> {
  const bmp = await createImageBitmap(file)
  const kind = guessKind(bmp.width, bmp.height)
  bmp.close()
  const small = await compressImage(file, 1920)
  return { path: await uploadKronika(small), kind }
}

/** Bilder ur en paste- eller drop-händelse. */
export function imageFiles(list: DataTransferItemList | FileList | null | undefined): File[] {
  if (!list) return []
  const files = list instanceof FileList
    ? [...list]
    : [...list].map((i) => (i.kind === 'file' ? i.getAsFile() : null))
  return files.filter((f): f is File => !!f && f.type.startsWith('image/'))
}

// ---------- Bildprompt ----------

/** Namnfärg i ord, eftersom bildmodeller följer färgnamn bättre än hexkoder. */
export function colorName(hex: string): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim())
  if (!m) return hex
  const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max - min < 0.12) return l > 0.75 ? 'white' : l < 0.25 ? 'black' : 'grey'
  const d = max - min
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h = (h * 60 + 360) % 360
  const name =
    h < 15 ? 'red' : h < 40 ? 'orange' : h < 65 ? 'yellow' : h < 160 ? 'green' : h < 200 ? 'cyan' :
    h < 245 ? 'blue' : h < 290 ? 'purple' : h < 335 ? 'pink' : 'red'
  return `${l > 0.72 ? 'light ' : l < 0.3 ? 'dark ' : ''}${name}`
}

export interface PromptInput {
  caption: string | null
  quotes: Quote[]
  cast_names: string[]
  pet_names: Record<string, string>
  source_ids: string[]
  subzone: string | null
}

export function buildPrompt(style: string, chapter: Pick<Chapter, 'zone' | 'subzone'>, moment: PromptInput, cast: CastMember[]): string {
  const people = moment.cast_names
    .map((n) => cast.find((c) => c.name === n))
    .filter((c): c is CastMember => !!c)
  const zone = chapter.zone?.trim()
  const sub = (moment.subzone ?? chapter.subzone)?.trim()
  const quotes = moment.quotes.filter((q) => q.text.trim())

  const parts = [style.trim(), '']
  parts.push(
    zone
      ? `ZONE PLAQUE: "${zone.toUpperCase()}"${sub ? ` with the subtitle "${sub.toUpperCase()}"` : ''}.`
      : 'No zone plaque, only the logo.',
  )
  if (people.length) {
    parts.push('', 'CHARACTERS IN THE SCENE (keep them exactly like the attached reference images):')
    for (const c of people) {
      // Husdjur får nytt namn vid varje summon; utan namn ingen namnskylt
      const tag = c.role === 'husdjur' ? moment.pet_names[c.name]?.trim() : c.name
      const label = tag && tag !== c.name ? `${c.name} (named ${tag})` : c.name
      parts.push(`- ${label}: ${c.look.trim() || 'see reference image'} ${tag ? `Name tag "${tag}" in ${colorName(c.tag_color)}.` : 'No name tag.'}`)
    }
  }
  parts.push('', `SCENE: ${moment.caption?.trim() || '(describe what happens)'}`)
  if (moment.source_ids.length) {
    parts.push('Also attached: in-game screenshots of the real moment. Use them for the location, layout, enemies and composition, redrawn in the style above.')
  }
  if (quotes.length) {
    parts.push('', 'SPEECH BUBBLES (exact text, keep the Swedish):')
    for (const q of quotes) parts.push(`- ${q.who ? `${q.who} says` : 'Caption'}: "${q.text.trim()}"`)
  } else {
    parts.push('', 'No speech bubbles.')
  }
  return parts.join('\n')
}

// ---------- Krönikören ----------

export interface SceneDraft {
  title: string
  caption: string
  cast_names: string[]
  pet_names: Record<string, string>
  quotes: Quote[]
  subzone: string | null
  source_ids: string[]
  why: string
}

export interface ChronicleDraft {
  title: string
  summary: string
  story: string
  captions: { entry_id: string; caption: string }[]
  scenes: SceneDraft[]
}

/** Låter Claude läsa kapitlets minnen och skriva ett utkast (Edge Function berattelse). */
export async function writeChronicle(chapterId: string): Promise<ChronicleDraft> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/berattelse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
    body: JSON.stringify({ chapter_id: chapterId }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `Krönikören svarade inte (${res.status})`)
  return body.draft as ChronicleDraft
}

// ---------- Datum ----------

export function formatDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function weekday(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('sv-SE', { weekday: 'long' })
}

// ---------- Laddning ----------

export async function loadCastAndStyle(): Promise<{ cast: CastMember[]; style: string }> {
  const [c, s] = await Promise.all([
    supabase.from('chronicle_cast').select('*').order('position').order('name'),
    supabase.from('chronicle_settings').select('value').eq('key', 'stil').maybeSingle(),
  ])
  if (c.error) throw c.error
  return { cast: (c.data as CastMember[]) ?? [], style: s.data?.value ?? '' }
}

export function sortEntries(list: Entry[]): Entry[] {
  return [...list].sort((a, b) => a.position - b.position)
}

/** Felet när migrationen inte körts än. */
export function missingTables(message: string | undefined): boolean {
  return !!message && /chronicle_|schema cache|does not exist/i.test(message)
}
