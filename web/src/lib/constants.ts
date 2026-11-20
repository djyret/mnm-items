import { getLang, translate, type Lang } from './i18n'
import type { Status } from './types'

/** Klasskoder sedda i spelet. Listan i filtren kompletteras med det som finns i databasen. */
export const CLASSES: Record<string, string> = {
  ARC: 'Archer',
  BRD: 'Bard',
  BST: 'Beastmaster',
  CLR: 'Cleric',
  DRU: 'Druid',
  ELE: 'Elementalist',
  ENC: 'Enchanter',
  FTR: 'Fighter',
  INQ: 'Inquisitor',
  MNK: 'Monk',
  NEC: 'Necromancer',
  PAL: 'Paladin',
  RNG: 'Ranger',
  ROG: 'Rogue',
  SHD: 'Shadow Knight',
  SHM: 'Shaman',
  SPB: 'Spellblade',
  WIZ: 'Wizard',
}

/** Slots i samma ordning som karaktärsfönstret. */
export const SLOTS = [
  'HEAD', 'FACE', 'NECK', 'EAR', 'SHOULDERS', 'CHEST', 'BACK', 'SHIRT', 'WRIST',
  'HANDS', 'FINGER', 'WAIST', 'LEGS', 'FEET', 'PRIMARY', 'SECONDARY', 'RANGE', 'AMMO',
]

const ICONS = `${import.meta.env.BASE_URL}ikoner/`
const SLOT_ICONS = new Set([...SLOTS, 'BACKPACK', 'BAG', 'BELT'])

export function classIcon(code: string): string | null {
  return CLASSES[code] !== undefined ? `${ICONS}klass/${code}.webp` : null
}

export function slotIcon(slot: string | undefined): string {
  const s = slot === 'ARMS' ? 'SHIRT' : slot
  return `${ICONS}slot/${s && SLOT_ICONS.has(s) ? s : 'INVENTORY'}.webp`
}

/** Visningsordning och etiketter för stats. Okända nycklar visas sist. */
export const STAT_LABELS: Record<string, string> = {
  STR: 'STR', STA: 'STA', AGI: 'AGI', DEX: 'DEX', INT: 'INT', WIS: 'WIS', CHA: 'CHA',
  HP: 'HP', MANA: 'Mana', END: 'Endurance',
  DMG: 'Damage', DLY: 'Delay', RANGE: 'Range',
  SV_FIRE: 'SV Fire', SV_COLD: 'SV Cold', SV_POISON: 'SV Poison', SV_DISEASE: 'SV Disease',
  SV_MAGIC: 'SV Magic', SV_CORRUPTION: 'SV Corruption', SV_HOLY: 'SV Holy', SV_ELEC: 'SV Elec',
}

export const STAT_GROUPS: string[][] = [
  ['STR', 'STA', 'AGI', 'DEX', 'INT', 'WIS', 'CHA'],
  ['HP', 'MANA', 'END'],
  ['DMG', 'DLY', 'RANGE'],
  ['SV_FIRE', 'SV_COLD', 'SV_POISON', 'SV_DISEASE', 'SV_MAGIC', 'SV_CORRUPTION', 'SV_HOLY', 'SV_ELEC'],
]

/** Stats med förklaring (från Referensfiler/MnM Stats.txt), visas när man hovrar. Texterna ligger i i18n. */
const STAT_HELP_KEYS = ['STR', 'STA', 'AGI', 'DEX', 'WIS', 'INT', 'CHA', 'AC', 'HP', 'MANA', 'DMG', 'DLY'] as const
type StatHelpKey = (typeof STAT_HELP_KEYS)[number]

export function statHelp(key: string, lang: Lang = getLang()): string | undefined {
  return (STAT_HELP_KEYS as readonly string[]).includes(key)
    ? translate(lang, `forradet.statHelp.${key as StatHelpKey}`)
    : undefined
}

export function weaponRatio(stats: Record<string, number>): number | null {
  return stats.DMG && stats.DLY ? stats.DMG / stats.DLY : null
}

/** Statuskoderna i databasen, i visningsordning. */
export const STATUSES: Status[] = ['ledig', 'equippad', 'utlanad', 'reserverad', 'sald']

/** Visningsetikett för en status. Slås upp vid anrop så att språkbytet slår igenom. */
export function statusLabel(s: Status, lang: Lang = getLang()): string {
  return translate(lang, `forradet.status.${s}`)
}

/**
 * Fasta texter som skrivs i item_events.note. De är data och lagras på svenska som förut;
 * historiken på itemsidan översätter dem vid visning.
 */
export const EVENT_NOTES = {
  ledig: 'Ledig',
  equippad: 'Equippad',
  utlanad: 'Utlånad',
  reserverad: 'Reserverad',
  sald: 'Såld',
  guideRemoved: 'Riktpris borttaget',
  /** Följs av priset, t.ex. "Riktpris 2p 15g". */
  guideSet: 'Riktpris ',
  unsold: 'Ångrade försäljning',
} as const

export const KNOWN_FLAGS = ['MAGIC', 'UNIQUE', 'LORE', 'NORENT', 'QUEST']

export function statLabel(key: string): string {
  return STAT_LABELS[key] ?? key.replace(/_/g, ' ')
}

export function normalizeStatKey(key: string): string {
  const k = key.trim().toUpperCase().replace(/[\s:]+/g, '_')
  const aliases: Record<string, string> = {
    ENDURANCE: 'END', HITPOINTS: 'HP', HIT_POINTS: 'HP', DAMAGE: 'DMG', DELAY: 'DLY',
    SV_ELECTRIC: 'SV_ELEC', SV_CORR: 'SV_CORRUPTION', SV_DIS: 'SV_DISEASE', SV_POI: 'SV_POISON',
  }
  return aliases[k] ?? k
}
