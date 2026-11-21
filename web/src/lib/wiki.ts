// Uppslag mot Monsters and Memories Wiki via Edge Function wiki-item (nyckeln stannar på servern).
// Villkor från wikin: bara uppslag, och visa källan med länk där datan syns (WikiCredit).
import { callFunction } from './functions'
import { parsedToDraft } from './items'
import type { ItemDraft, ParsedItem } from './types'

export const WIKI_HOME = 'https://monstersandmemories.wiki'

export interface WikiHit {
  id: string
  name: string
  url: string
  icon: string | null
  slot: string[]
}

export interface WikiRef {
  id: string
  url: string
  icon: string | null
}

export async function searchWiki(q: string): Promise<WikiHit[]> {
  const { results } = await callFunction<{ results: WikiHit[] }>('wiki-item', { action: 'search', q })
  return results
}

export async function fetchWikiItem(id: string): Promise<{ item: ParsedItem; wiki: WikiRef }> {
  return callFunction('wiki-item', { action: 'item', id })
}

/** Exakt namnträff (utan skiftläge), annars null. */
export async function findExact(name: string): Promise<WikiHit | null> {
  const n = name.trim().toLowerCase()
  if (!n) return null
  const hits = await searchWiki(name)
  return hits.find((h) => h.name.trim().toLowerCase() === n) ?? null
}

export const wikiFields = (w: WikiRef): Pick<ItemDraft, 'wiki_id' | 'wiki_url' | 'wiki_icon'> => ({
  wiki_id: w.id,
  wiki_url: w.url,
  wiki_icon: w.icon,
})

/** Hela utkastet från wikin, med ägare och status kvar från det man redan valt. */
export function wikiToDraft(item: ParsedItem, wiki: WikiRef, base: ItemDraft): ItemDraft {
  return { ...parsedToDraft(item, base), ...wikiFields(wiki) }
}

/**
 * Fyller bara tomma fält från wikin (för befintliga items): det gänget skrivit in, och
 * enchants, skrivs aldrig över.
 */
export function fillEmpty(current: ItemDraft, item: ParsedItem, wiki: WikiRef): Partial<ItemDraft> {
  const w = parsedToDraft(item, current)
  const patch: Partial<ItemDraft> = { ...wikiFields(wiki) }
  if (current.slots.length === 0) patch.slots = w.slots
  if (current.classes.length === 0) patch.classes = w.classes
  if (current.races.length === 0) patch.races = w.races
  if (current.flags.length === 0) patch.flags = w.flags
  if (current.ac == null && w.ac != null) patch.ac = w.ac
  if (current.weight == null && w.weight != null) patch.weight = w.weight
  if (!current.size && w.size) patch.size = w.size
  if (Object.keys(current.stats).length === 0) patch.stats = w.stats
  if (!current.effect && w.effect) patch.effect = w.effect
  return patch
}
