// Character Armory: slotplatser, vem som bär ett item och anropen för att ta på/av.
// Databasen (trigger items_equipment_sync) håller status och slot i takt och loggar
// 'utrustad'/'avtagen' i item_events, så webben behöver bara sätta equipped_slot.
import { useEffect, useState } from 'react'
import { getLang, translate, type Lang } from './i18n'
import { supabase } from './supabase'
import type { Item } from './types'

/** Slotnamn som har en text: alla platser plus basnamnen EAR/WRIST/FINGER (önskelistan). */
const SLOT_LABEL_KEYS = [
  'HEAD', 'FACE', 'EAR', 'EAR_1', 'EAR_2', 'NECK', 'SHOULDERS', 'BACK', 'CHEST', 'SHIRT',
  'WRIST', 'WRIST_1', 'WRIST_2', 'HANDS', 'FINGER', 'FINGER_1', 'FINGER_2', 'WAIST', 'LEGS', 'FEET',
  'PRIMARY', 'SECONDARY', 'RANGE', 'AMMO',
] as const
type SlotLabelKey = (typeof SLOT_LABEL_KEYS)[number]

/** Slotnamn på valt språk; okänd kod visas som den är. */
export function slotLabel(slot: string, lang: Lang = getLang()): string {
  return (SLOT_LABEL_KEYS as readonly string[]).includes(slot)
    ? translate(lang, `armory.slot.${slot as SlotLabelKey}`)
    : slot
}

export interface ChapterRef {
  id: string
  title: string
  played_on: string
}

/** Kapitel man får läsa (RLS), nyast först. För "hittades i kapitel". */
export function useChapters(): ChapterRef[] {
  const [list, setList] = useState<ChapterRef[]>([])
  useEffect(() => {
    supabase
      .from('chronicle_chapters')
      .select('id, title, played_on')
      .order('played_on', { ascending: false })
      .then(({ data }) => setList((data as ChapterRef[]) ?? []))
  }, [])
  return list
}

/** Alla slotplatser. EAR, WRIST och FINGER finns två av, som i spelet. Samma lista som i migrationen. */
export const EQUIP_SLOTS = [
  'HEAD', 'FACE', 'EAR_1', 'EAR_2', 'NECK', 'SHOULDERS', 'BACK', 'CHEST', 'SHIRT',
  'WRIST_1', 'WRIST_2', 'HANDS', 'FINGER_1', 'FINGER_2', 'WAIST', 'LEGS', 'FEET',
  'PRIMARY', 'SECONDARY', 'RANGE', 'AMMO',
] as const
export type EquipSlot = (typeof EQUIP_SLOTS)[number]

/** Placering runt porträttet: vänster, höger och raden under. */
export const DOLL = {
  left: ['HEAD', 'FACE', 'EAR_1', 'EAR_2', 'NECK', 'SHOULDERS', 'BACK', 'CHEST', 'SHIRT'],
  right: ['WRIST_1', 'WRIST_2', 'HANDS', 'FINGER_1', 'FINGER_2', 'WAIST', 'LEGS', 'FEET'],
  bottom: ['PRIMARY', 'SECONDARY', 'RANGE', 'AMMO'],
} as const satisfies Record<string, readonly EquipSlot[]>

/** EAR_2 -> EAR. Basnamnet är det som står i items.slots och har en ikon. */
export function slotBase(slot: string): string {
  return slot.replace(/_[12]$/, '')
}

export function isEquipSlot(s: string | null | undefined): s is EquipSlot {
  return !!s && (EQUIP_SLOTS as readonly string[]).includes(s)
}

/** Den som har itemet på sig: låntagaren när det är utlånat, annars ägaren. */
export function wearerOf(item: Pick<Item, 'status' | 'holder_id' | 'lent_to_id'>): string | null {
  return item.status === 'utlanad' ? item.lent_to_id : item.holder_id
}

/** Passar itemet i slotplatsen? Item utan slots (okänd avläsning) passar överallt. */
export function fitsSlot(item: Pick<Item, 'slots'>, slot: string): boolean {
  const base = slotBase(slot)
  return item.slots.length === 0 || item.slots.includes(base) || (base === 'SHIRT' && item.slots.includes('ARMS'))
}

/** Slotplatser ett item kan sitta i, i karaktärsfönstrets ordning. */
export function slotsFor(item: Pick<Item, 'slots'>): EquipSlot[] {
  return EQUIP_SLOTS.filter((s) => item.slots.length > 0 && fitsSlot(item, s))
}

/** Items en karaktär bär, per slot. */
export function equippedBy(items: Item[], characterId: string): Map<string, Item> {
  const map = new Map<string, Item>()
  for (const i of items) if (i.equipped_slot && wearerOf(i) === characterId) map.set(i.equipped_slot, i)
  return map
}

/** Kan läggas i en slot hos karaktären: ägt eller lånat, inte sålt/reserverat. */
export function canEquipOn(item: Item, characterId: string): boolean {
  return (item.status === 'ledig' || item.status === 'equippad' || item.status === 'utlanad') && wearerOf(item) === characterId
}

/** Tar på itemet; det som satt i slotten tas av i samma transaktion. */
export async function equipItem(itemId: string, slot: string): Promise<string | null> {
  const { error } = await supabase.rpc('equip_item', { p_item: itemId, p_slot: slot })
  return error?.message ?? null
}

export async function unequipItem(itemId: string): Promise<string | null> {
  const { error } = await supabase.from('items').update({ equipped_slot: null }).eq('id', itemId)
  return error?.message ?? null
}

/** Jämför namn utan skiftläge och extra mellanslag (önskelistan mot förrådet). */
export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
