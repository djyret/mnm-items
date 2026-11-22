// Wikiindexet (tabellen wiki_items) som setbyggaren väljer ur. Gromple, wikins admin, gav
// 2026-11-22 OK till kopian för gängets begränsade bruk. Admin fyller det via Edge Function
// wiki-index; webben styr körningen i små steg och hämtar bara det som är nytt eller ändrat.
import { useCallback, useEffect, useState } from 'react'
import { RACES } from './basestats'
import { CLASSES, normalizeStatKey } from './constants'
import { callFunction } from './functions'
import { emptyDraft } from './items'
import { supabase } from './supabase'
import type { Item } from './types'

export interface WikiIndexItem {
  id: string
  name: string
  url: string
  icon: string | null
  slots: string[]
  classes: string[]
  races: string[]
  flags: string[]
  two_hand: boolean
  ac: number | null
  stats: Record<string, number>
  zones: string[]
  sources: string[]
}

const COLUMNS = 'id, name, url, icon, slots, classes, races, flags, two_hand, ac, stats, zones, sources'
const PAGE = 1000

/** Alla rader som matchar, sida för sida (PostgREST ger högst 1000 åt gången). */
async function allRows<T>(query: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const rows = (data as T[]) ?? []
    out.push(...rows)
    if (rows.length < PAGE) return out
  }
}

/** Bärbara items som klassen kan använda (eller som saknar klasslista). */
export async function loadGear(cls: string | null): Promise<WikiIndexItem[]> {
  const c = cls?.toUpperCase()
  const rows = await allRows<WikiIndexItem>((from, to) => {
    let q = supabase.from('wiki_items').select(COLUMNS).not('slots', 'eq', '{}')
    if (c && CLASSES[c]) q = q.or(`classes.cs.{${c}},classes.cs.{ALL},classes.eq.{}`)
    return q.order('id').range(from, to)
  })
  return rows.map((r) => ({
    ...r,
    stats: Object.fromEntries(Object.entries(r.stats ?? {}).map(([k, v]) => [normalizeStatKey(k), Number(v)])),
  }))
}

/** Kan rasen bära itemet? Okänd ras eller ingen raslista räknas som ja. */
export function raceAllows(item: Pick<WikiIndexItem, 'races'>, race: string | null): boolean {
  if (!race || item.races.length === 0 || item.races.includes('ALL')) return true
  const name = RACES[race]?.toUpperCase()
  return item.races.some((r) => r === race || r === name || r.replace(/[^A-Z]/g, '') === name?.replace(/[^A-Z]/g, ''))
}

/** Ett indexitem i Item-form, för tooltip och statsruta. */
export function indexAsItem(w: WikiIndexItem, slot: string): Item {
  return {
    ...emptyDraft(),
    id: `wiki:${w.id}`,
    name: w.name,
    slots: w.slots,
    classes: w.classes,
    races: w.races,
    flags: w.flags,
    ac: w.ac,
    stats: w.stats,
    wiki_id: w.id,
    wiki_url: w.url,
    wiki_icon: w.icon,
    equipped_slot: slot,
    created_at: '',
    updated_at: '',
  }
}

// ---------- Admin: fyll indexet ----------

export interface IndexInfo {
  gear: number
  total: number
  lastSync: string | null
}

export function useIndexInfo() {
  const [info, setInfo] = useState<IndexInfo | null>(null)
  const reload = useCallback(async () => {
    const [gear, total, last] = await Promise.all([
      supabase.from('wiki_items').select('id', { count: 'exact', head: true }).not('slots', 'eq', '{}'),
      supabase.from('wiki_items').select('id', { count: 'exact', head: true }),
      supabase.from('wiki_items').select('synced_at').order('synced_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    setInfo({ gear: gear.count ?? 0, total: total.count ?? 0, lastSync: (last.data as { synced_at: string } | null)?.synced_at ?? null })
  }, [])
  useEffect(() => {
    reload()
  }, [reload])
  return { info, reload }
}

export interface SyncProgress {
  phase: 'list' | 'fetch' | 'done'
  done: number
  todo: number
  failed: number
}

const BATCH = 40

/**
 * Hämtar wikins itemlista, jämför med det som redan finns och hämtar nya och ändrade items i
 * omgångar om 40. Kan avbrytas och köras igen; det som redan sparats hoppas över.
 */
export async function syncIndex(onProgress: (p: SyncProgress) => void, signal: AbortSignal): Promise<SyncProgress> {
  const entries: { id: string; updatedAt: string | null }[] = []
  for (let offset: number | null = 0; offset !== null && !signal.aborted;) {
    onProgress({ phase: 'list', done: entries.length, todo: 0, failed: 0 })
    const res: { entries: typeof entries; next: number | null } = await callFunction('wiki-index', { action: 'list', offset })
    entries.push(...res.entries)
    offset = res.next
  }

  const have = new Map(
    (await allRows<{ id: string; wiki_updated_at: string | null }>((from, to) =>
      supabase.from('wiki_items').select('id, wiki_updated_at').order('id').range(from, to)))
      .map((r) => [r.id, r.wiki_updated_at]),
  )
  const todo = entries.filter((e) => {
    if (!have.has(e.id)) return true
    const stored = have.get(e.id)
    return !!e.updatedAt && (!stored || new Date(e.updatedAt) > new Date(stored))
  })

  const p: SyncProgress = { phase: 'fetch', done: 0, todo: todo.length, failed: 0 }
  onProgress({ ...p })
  for (let i = 0; i < todo.length && !signal.aborted; i += BATCH) {
    const res: { saved: number; failed: string[] } = await callFunction('wiki-index', { action: 'fetch', items: todo.slice(i, i + BATCH) })
    p.done = Math.min(todo.length, i + BATCH)
    p.failed += res.failed.length
    onProgress({ ...p })
  }
  return { ...p, phase: signal.aborted ? 'fetch' : 'done' }
}
