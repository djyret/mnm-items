// Önskeset i Armory: upp till 4 tänkta utrustningar per karaktär (tabellerna gear_sets och
// gear_set_items). Set-items görs om till Item-form så att dockan, tooltipen och statsrutan
// kan visa dem precis som riktig utrustning.
import { useCallback, useEffect, useState } from 'react'
import { emptyDraft, itemIconUrl, parsedToDraft } from './items'
import { supabase } from './supabase'
import type { Item, ParsedItem } from './types'
import type { WikiRef } from './wiki'

export const MAX_SETS = 4

export interface GearSet {
  id: string
  character_id: string
  name: string
  position: number
  created_at: string
}

export interface GearSetItem {
  set_id: string
  slot: string
  item_id: string | null
  wiki_id: string | null
  wiki_url: string | null
  name: string
  icon: string | null
  slots: string[]
  classes: string[]
  ac: number | null
  stats: Record<string, number>
  enchant_stats: Record<string, number>
}

type Row = Omit<GearSetItem, 'set_id' | 'slot'>

export function useGearSets(characterId: string) {
  const [sets, setSets] = useState<GearSet[]>([])
  const [rows, setRows] = useState<GearSetItem[]>([])

  const reload = useCallback(async () => {
    const { data: s } = await supabase.from('gear_sets').select('*').eq('character_id', characterId).order('position').order('created_at')
    const list = (s as GearSet[]) ?? []
    setSets(list)
    if (list.length === 0) {
      setRows([])
      return
    }
    const { data: r } = await supabase.from('gear_set_items').select('*').in('set_id', list.map((x) => x.id))
    setRows((r as GearSetItem[]) ?? [])
  }, [characterId])

  useEffect(() => {
    reload()
  }, [reload])

  return { sets, rows, reload }
}

/** Ett set-item i Item-form (id "set:<slot>") för docka, tooltip och statsruta. */
export function asItem(r: GearSetItem): Item {
  return {
    ...emptyDraft(),
    id: `set:${r.slot}`,
    name: r.name,
    slots: r.slots,
    classes: r.classes,
    ac: r.ac,
    stats: r.stats,
    enchant_stats: r.enchant_stats,
    wiki_id: r.wiki_id,
    wiki_url: r.wiki_url,
    wiki_icon: r.icon,
    equipped_slot: r.slot,
    created_at: '',
    updated_at: '',
  }
}

export function rowFromWiki(item: ParsedItem, wiki: WikiRef): Row {
  const d = parsedToDraft(item, emptyDraft())
  return {
    item_id: null, wiki_id: wiki.id, wiki_url: wiki.url, name: d.name, icon: wiki.icon,
    slots: d.slots, classes: d.classes, ac: d.ac, stats: d.stats, enchant_stats: {},
  }
}

export function rowFromStash(i: Item): Row {
  return {
    item_id: i.id, wiki_id: i.wiki_id, wiki_url: i.wiki_url, name: i.name, icon: itemIconUrl(i),
    slots: i.slots, classes: i.classes, ac: i.ac, stats: i.stats, enchant_stats: i.enchant_stats ?? {},
  }
}

export async function putSetItem(setId: string, slot: string, row: Row): Promise<string | null> {
  const { error } = await supabase.from('gear_set_items').upsert({ set_id: setId, slot, ...row })
  return error?.message ?? null
}

export async function removeSetItem(setId: string, slot: string): Promise<string | null> {
  const { error } = await supabase.from('gear_set_items').delete().eq('set_id', setId).eq('slot', slot)
  return error?.message ?? null
}
