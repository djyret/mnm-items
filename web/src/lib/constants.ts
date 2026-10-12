import type { Status } from './types'

/** Klasskoder sedda i spelet. Listan i filtren kompletteras med det som finns i databasen. */
export const CLASSES: Record<string, string> = {
  ARC: '',
  BRD: 'Bard',
  BST: '',
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
  'HEAD', 'FACE', 'EAR', 'NECK', 'SHOULDERS', 'ARMS', 'BACK', 'WRIST', 'HANDS',
  'FINGER', 'CHEST', 'WAIST', 'LEGS', 'FEET', 'PRIMARY', 'SECONDARY', 'RANGE', 'AMMO',
]

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

/** Förklaringar från Referensfiler/MnM Stats.txt, visas när man hovrar. */
export const STAT_HELP: Record<string, string> = {
  STR: 'Bärvikt (1 STR = 2 weight), melee/ranged-skada och shield block',
  STA: 'Mer HP (ca 1 STA = 1 HP), mindre risk att bli dazed',
  AGI: 'Skademitigering',
  DEX: 'Träffchans, proc-frekvens på vapen, channeling för casters',
  WIS: 'Mana (om WIS > INT, 4 mana per WIS) och starkare heals',
  INT: 'Mana (om INT > WIS) och starkare skadespells',
  CHA: 'Handelspriser och charm (verkar inte ge effekt än)',
  AC: 'Mitigerar fysisk skada',
  HP: 'Hur mycket skada du tål',
  MANA: 'Används för att kasta spells',
  DMG: 'Vapenskada – jämför med Ratio (DMG/DLY)',
  DLY: 'Attackfördröjning – lägre är snabbare',
}

export function weaponRatio(stats: Record<string, number>): number | null {
  return stats.DMG && stats.DLY ? stats.DMG / stats.DLY : null
}

export const STATUS_LABELS: Record<Status, string> = {
  ledig: 'Ledig',
  equippad: 'Equippad',
  utlanad: 'Utlånad',
  reserverad: 'Reserverad',
  sald: 'Såld',
}

export const STATUSES = Object.keys(STATUS_LABELS) as Status[]

export const KNOWN_FLAGS = ['MAGIC', 'UNIQUE', 'NODROP', 'LORE', 'NORENT', 'QUEST']

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
