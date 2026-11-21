// Gästernas armory: vänner utanför gänget med egna karaktärer, "Nu"-utrustning och önskeset
// (tabellerna guest_characters, guest_sets, guest_set_items). Helt skilt från förrådet: inget här
// pekar på items eller characters. Raderna görs om till Item-form så att dockan, tooltipen och
// statsrutan kan visa dem som riktig utrustning.
import { useCallback, useEffect, useState } from 'react'
import { CLASSES } from './constants'
import { blobToBase64, compressImage, cropIcon, emptyDraft, parseImage, parsedToDraft } from './items'
import { supabase } from './supabase'
import type { Item, ItemDraft, ParsedItem } from './types'
import { findExact, wikiFields, type WikiRef } from './wiki'

export const MAX_GUEST_WISHES = 4
export const MAX_GUEST_CHARS = 6

export interface GuestCharacter {
  id: string
  owner_id: string
  name: string
  class: string | null
  race: string | null
  level: number | null
  created_at: string
}

export interface GuestSet {
  id: string
  guest_id: string
  kind: 'now' | 'wish'
  name: string
  position: number
  created_at: string
}

/** Resten av tooltipen, utöver det dockan och statsrutan behöver. */
type Detail = Pick<ItemDraft, 'flags' | 'effect' | 'description' | 'weight' | 'size' | 'races' | 'extra_lines' | 'enchant_name'>

export interface GuestSetItem {
  set_id: string
  slot: string
  wiki_id: string | null
  wiki_url: string | null
  name: string
  /** Wikins ikonadress eller en urklippt ikon som data-URL */
  icon: string | null
  slots: string[]
  classes: string[]
  ac: number | null
  stats: Record<string, number>
  enchant_stats: Record<string, number>
  detail: Partial<Detail>
}

type Row = Omit<GuestSetItem, 'set_id' | 'slot'>

export type GuestDraft = Pick<GuestCharacter, 'name' | 'class' | 'race' | 'level'>

/** "Level 20 · Halfling · Warrior" */
export const guestInfo = (c: Pick<GuestCharacter, 'level' | 'race' | 'class'>) =>
  [c.level && `Level ${c.level}`, c.race, c.class && (CLASSES[c.class] || c.class)].filter(Boolean).join(' · ')

export function useGuestCharacters() {
  const [list, setList] = useState<GuestCharacter[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('guest_characters').select('*').order('name')
    setError(error?.message ?? null)
    setList((data as GuestCharacter[]) ?? [])
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { list, error, reload }
}

export function useGuestGear(guestId: string) {
  const [sets, setSets] = useState<GuestSet[]>([])
  const [rows, setRows] = useState<GuestSetItem[]>([])
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(async () => {
    const { data: s } = await supabase.from('guest_sets').select('*').eq('guest_id', guestId).order('position').order('created_at')
    const list = (s as GuestSet[]) ?? []
    setSets(list)
    if (list.length === 0) setRows([])
    else {
      const { data: r } = await supabase.from('guest_set_items').select('*').in('set_id', list.map((x) => x.id))
      setRows((r as GuestSetItem[]) ?? [])
    }
    setLoaded(true)
  }, [guestId])

  useEffect(() => {
    reload()
  }, [reload])

  return { sets, rows, loaded, reload }
}

// ---------- Från rad till Item ----------
// Raderna skrivs av gäster: tvätta typerna så att en konstig rad inte kan krascha tooltipen.

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
const nums = (v: unknown): Record<string, number> =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).filter(([, n]) => typeof n === 'number' && Number.isFinite(n)))
    : {}

/** Ett gäst-item i Item-form (id "guest:<set>:<slot>"). */
export function asGuestItem(r: GuestSetItem): Item {
  const d = (r.detail ?? {}) as Record<string, unknown>
  return {
    ...emptyDraft(),
    id: `guest:${r.set_id}:${r.slot}`,
    name: r.name,
    slots: strs(r.slots),
    classes: strs(r.classes),
    ac: typeof r.ac === 'number' ? r.ac : null,
    stats: nums(r.stats),
    enchant_stats: nums(r.enchant_stats),
    flags: strs(d.flags),
    effect: str(d.effect),
    description: str(d.description),
    weight: typeof d.weight === 'number' ? d.weight : null,
    size: str(d.size),
    races: strs(d.races),
    extra_lines: strs(d.extra_lines),
    enchant_name: str(d.enchant_name),
    wiki_id: r.wiki_id,
    wiki_url: r.wiki_url,
    wiki_icon: r.icon,
    equipped_slot: r.slot,
    created_at: '',
    updated_at: '',
  }
}

function rowFromDraft(d: ItemDraft, icon: string | null): Row {
  return {
    wiki_id: d.wiki_id,
    wiki_url: d.wiki_url,
    name: d.name.trim() || '?',
    icon,
    slots: d.slots,
    classes: d.classes,
    ac: d.ac,
    stats: d.stats,
    enchant_stats: d.enchant_stats ?? {},
    detail: {
      flags: d.flags, effect: d.effect, description: d.description, weight: d.weight,
      size: d.size, races: d.races, extra_lines: d.extra_lines, enchant_name: d.enchant_name,
    },
  }
}

export function rowFromWiki(item: ParsedItem, wiki: WikiRef): Row {
  return rowFromDraft({ ...parsedToDraft(item, emptyDraft()), ...wikiFields(wiki) }, wiki.icon)
}

/**
 * Läser en skärmdump av item-fönstret (parse-item, räknas mot kvoten). Ikonen klipps ut och sparas
 * inbäddad i raden; finns itemet på wikin länkas det, och wikins ikon används om ingen gick att klippa.
 */
export async function rowFromScreenshot(file: Blob): Promise<Row> {
  const small = await compressImage(file)
  const parsed = await parseImage(small)
  let draft = parsedToDraft(parsed, emptyDraft())
  let icon: string | null = null
  if (parsed.icon_box) {
    const ic = await cropIcon(small, parsed.icon_box, 64)
    icon = `data:image/webp;base64,${await blobToBase64(ic)}`
  }
  const hit = await findExact(parsed.name).catch(() => null)
  if (hit) {
    draft = { ...draft, wiki_id: hit.id, wiki_url: hit.url }
    if (!icon) icon = hit.icon
  }
  return rowFromDraft(draft, icon)
}

export async function putGuestItem(setId: string, slot: string, row: Row): Promise<string | null> {
  const { error } = await supabase.from('guest_set_items').upsert({ set_id: setId, slot, ...row })
  return error?.message ?? null
}

export async function removeGuestItem(setId: string, slot: string): Promise<string | null> {
  const { error } = await supabase.from('guest_set_items').delete().eq('set_id', setId).eq('slot', slot)
  return error?.message ?? null
}

/** Skapar karaktären och dess "Nu"-set. */
export async function createGuest(d: GuestDraft, nowName: string): Promise<string | null> {
  const { data, error } = await supabase.from('guest_characters').insert(d).select('id').single()
  if (error) return error.message
  const s = await supabase.from('guest_sets').insert({ guest_id: data.id, kind: 'now', name: nowName, position: 0 })
  return s.error?.message ?? null
}
