// Grundstats när karaktären skapas: rasens värden plus klassens tillägg, och 10 bonuspoäng som
// spelaren placerar själv (högst upp till taket för ras och klass). Siffrorna kommer från
// Monsters and Memories Wikis Character Planner (https://monstersandmemories.wiki/character-planner),
// hämtade 2026-11-22. Spelet är i early access, så de kan ändras. Wikin saknar grundstats för
// Deep Dwarf, High Elf, Troll och Var'nai än (null).

/** Ordningen i alla tabeller nedan. */
export const ATTRS = ['STR', 'STA', 'DEX', 'AGI', 'INT', 'WIS', 'CHA'] as const
export type Attr = (typeof ATTRS)[number]

export const BONUS_POINTS = 10

/** Rasernas koder (samma som spelet och wikin) och namn. */
export const RACES: Record<string, string> = {
  HUM: 'Human',
  GNM: 'Gnome',
  DGN: 'Deep Gnome',
  DWF: 'Dwarf',
  DDF: 'Deep Dwarf',
  HIE: 'High Elf',
  ELF: 'Wood Elf',
  DEF: 'Deep Elf',
  OGR: 'Ogre',
  HFL: 'Halfling',
  TRL: 'Troll',
  GOB: 'Goblin',
  VRN: "Var'nai",
}

const RACE_BASE: Record<string, number[] | null> = {
  HUM: [16, 17, 16, 16, 16, 16, 17],
  GNM: [14, 15, 19, 16, 20, 15, 15],
  DGN: [14, 15, 18, 18, 19, 14, 16],
  DWF: [17, 17, 18, 15, 16, 16, 15],
  DDF: null,
  HIE: null,
  ELF: [14, 14, 18, 20, 15, 17, 16],
  DEF: [14, 15, 16, 18, 19, 17, 15],
  OGR: [20, 19, 15, 14, 16, 15, 15],
  HFL: [15, 17, 16, 17, 14, 20, 15],
  TRL: null,
  GOB: [15, 15, 19, 19, 17, 16, 13],
  VRN: null,
}

const CLASS_BONUS: Record<string, Partial<Record<Attr, number>>> = {
  ARC: { STR: 2, DEX: 4, AGI: 2 },
  BRD: { STR: 1, DEX: 3, CHA: 4 },
  BST: { STR: 4, AGI: 2, WIS: 2 },
  CLR: { STR: 2, STA: 2, WIS: 3, CHA: 1 },
  DRU: { AGI: 2, WIS: 4, CHA: 2 },
  ELE: { STA: 4, INT: 4 },
  ENC: { INT: 4, CHA: 4 },
  FTR: { STR: 4, STA: 3, AGI: 1 },
  INQ: { STR: 1, STA: 3, DEX: 1, INT: 2, CHA: 1 },
  MNK: { STR: 1, DEX: 3, AGI: 4 },
  NEC: { DEX: 4, INT: 4 },
  PAL: { STR: 2, STA: 4, WIS: 2 },
  RNG: { STR: 1, DEX: 3, AGI: 2, WIS: 2 },
  ROG: { DEX: 4, AGI: 4 },
  SHD: { STR: 3, STA: 2, INT: 3 },
  SHM: { STR: 1, STA: 2, DEX: 1, WIS: 4 },
  SPB: { STR: 2, DEX: 3, INT: 3 },
  WIZ: { DEX: 4, INT: 4 },
}

/** Högsta värde (grund + bonuspoäng) vid skapandet, per ras och klass. Saknas = 30 som i wikin. */
const CAPS: Record<string, Record<string, number[]>> = {
  DEF: {
    ARC: [25, 25, 27, 25, 27, 25, 25], CLR: [25, 27, 25, 25, 27, 27, 23], ELE: [25, 27, 25, 25, 29, 25, 23],
    ENC: [25, 25, 25, 25, 29, 25, 25], FTR: [27, 27, 25, 25, 27, 25, 23], INQ: [25, 27, 25, 25, 27, 25, 25],
    MNK: [25, 25, 27, 27, 27, 25, 23], NEC: [25, 27, 25, 25, 29, 25, 23], PAL: [25, 27, 25, 25, 27, 27, 23],
    RNG: [25, 27, 25, 25, 27, 27, 23], ROG: [27, 25, 27, 25, 27, 25, 23], SHD: [25, 27, 25, 25, 29, 25, 23],
    SPB: [27, 25, 25, 25, 29, 25, 23], WIZ: [25, 25, 27, 25, 29, 25, 23],
  },
  DGN: {
    BST: [25, 23, 26, 26, 27, 27, 25], DRU: [23, 23, 26, 26, 27, 27, 27], ELE: [23, 25, 26, 26, 29, 25, 25],
    ENC: [23, 23, 26, 26, 29, 25, 27], NEC: [23, 25, 26, 26, 29, 25, 25], ROG: [25, 23, 28, 26, 27, 25, 25],
    SHM: [23, 23, 26, 28, 27, 27, 25], WIZ: [23, 23, 28, 26, 29, 25, 25],
  },
  DWF: {
    BRD: [25, 28, 25, 25, 25, 25, 26], CLR: [25, 28, 25, 25, 25, 27, 24], ELE: [25, 28, 25, 25, 27, 25, 24],
    ENC: [25, 26, 25, 25, 27, 25, 26], FTR: [27, 28, 25, 25, 25, 25, 24], PAL: [25, 28, 25, 25, 25, 27, 24],
    RNG: [25, 28, 25, 25, 25, 27, 24], ROG: [27, 26, 27, 25, 25, 25, 24], SPB: [27, 26, 25, 25, 27, 25, 24],
    WIZ: [25, 26, 27, 25, 27, 25, 24],
  },
  GNM: {
    CLR: [24, 26, 27, 25, 27, 26, 24], ELE: [24, 26, 27, 25, 29, 24, 24], ENC: [24, 24, 27, 25, 29, 24, 26],
    FTR: [26, 26, 27, 25, 27, 24, 24], NEC: [24, 26, 27, 25, 29, 24, 24], PAL: [24, 26, 27, 25, 27, 26, 24],
    ROG: [26, 24, 29, 25, 27, 24, 24], SPB: [26, 24, 27, 25, 29, 24, 24], WIZ: [24, 24, 29, 25, 29, 24, 24],
  },
  GOB: {
    ARC: [25, 25, 28, 27, 25, 24, 25], BST: [27, 25, 26, 27, 25, 26, 23], DRU: [25, 25, 26, 27, 25, 26, 25],
    ENC: [25, 25, 26, 27, 27, 24, 25], FTR: [27, 27, 26, 27, 25, 24, 23], NEC: [25, 27, 26, 27, 27, 24, 23],
    RNG: [25, 27, 26, 27, 25, 26, 23], ROG: [27, 25, 28, 27, 25, 24, 23], SHD: [25, 27, 26, 27, 27, 24, 23],
    SHM: [25, 25, 26, 29, 25, 26, 23],
  },
  HFL: {
    ARC: [25, 25, 28, 26, 24, 25, 26], BRD: [25, 27, 26, 26, 24, 25, 26], BST: [27, 25, 26, 26, 24, 27, 24],
    CLR: [25, 27, 26, 26, 24, 27, 24], DRU: [25, 25, 26, 26, 24, 27, 26], FTR: [27, 27, 26, 26, 24, 25, 24],
    PAL: [25, 27, 26, 26, 24, 27, 24], RNG: [25, 27, 26, 26, 24, 27, 24], ROG: [27, 25, 28, 26, 24, 25, 24],
  },
  HUM: {
    ARC: [25, 25, 27, 25, 25, 25, 27], BRD: [25, 27, 25, 25, 25, 25, 27], BST: [27, 25, 25, 25, 25, 27, 25],
    CLR: [25, 27, 25, 25, 25, 27, 25], DRU: [25, 25, 25, 25, 25, 27, 27], ELE: [25, 27, 25, 25, 27, 25, 25],
    ENC: [25, 25, 25, 25, 27, 25, 27], FTR: [27, 27, 25, 25, 25, 25, 25], INQ: [25, 27, 25, 25, 25, 25, 27],
    MNK: [25, 25, 27, 27, 25, 25, 25], NEC: [25, 27, 25, 25, 27, 25, 25], PAL: [25, 27, 25, 25, 25, 27, 25],
    RNG: [25, 27, 25, 25, 25, 27, 25], ROG: [27, 25, 27, 25, 25, 25, 25], SHD: [25, 27, 25, 25, 27, 25, 25],
    SHM: [25, 25, 25, 27, 25, 27, 25], SPB: [27, 25, 25, 25, 27, 25, 25], WIZ: [25, 25, 27, 25, 27, 25, 25],
  },
  OGR: {
    ARC: [27, 26, 26, 24, 26, 25, 25], BST: [29, 26, 24, 24, 26, 27, 23], ELE: [27, 28, 24, 24, 28, 25, 23],
    FTR: [29, 28, 24, 24, 26, 25, 23], MNK: [27, 26, 26, 26, 26, 25, 23], RNG: [27, 28, 24, 24, 26, 27, 23],
    SHD: [27, 28, 24, 24, 28, 25, 23], SHM: [27, 26, 24, 26, 26, 27, 23],
  },
  ELF: {
    ARC: [24, 23, 28, 27, 24, 26, 27], BRD: [24, 25, 26, 27, 24, 26, 27], BST: [26, 23, 26, 27, 24, 28, 25],
    DRU: [24, 23, 26, 27, 24, 28, 27], FTR: [26, 25, 26, 27, 24, 26, 25], RNG: [24, 25, 26, 27, 24, 28, 25],
    ROG: [26, 23, 28, 27, 24, 26, 25], SHM: [24, 23, 26, 29, 24, 28, 25],
  },
}

const DEFAULT_CAP = 30

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')

/** Rasens kod ur det som står på karaktären ("Wood Elf", "Woodelf", "ELF", "Human" …), annars null. */
export function raceCode(text: string | null | undefined): string | null {
  if (!text) return null
  const t = text.trim()
  if (RACES[t.toUpperCase()]) return t.toUpperCase()
  const n = norm(t)
  for (const [code, name] of Object.entries(RACES)) if (norm(name) === n) return code
  return null
}

export type StatPoints = Partial<Record<Attr, number>>

export interface BaseStats {
  /** Ras + klass, utan bonuspoäng */
  base: Record<Attr, number>
  /** Tak för grund + bonus vid skapandet */
  cap: Record<Attr, number>
}

/**
 * Grundstats för ras och klass, eller null om wikin inte har siffrorna (eller ras/klass saknas).
 * Klassen är koden (WIZ), rasen det som står på karaktären.
 */
export function baseStats(race: string | null | undefined, cls: string | null | undefined): BaseStats | null {
  const r = raceCode(race)
  const c = cls?.toUpperCase() ?? ''
  const row = r ? RACE_BASE[r] : null
  if (!row || !CLASS_BONUS[c]) return null
  const caps = r ? CAPS[r]?.[c] : undefined
  const base = {} as Record<Attr, number>
  const cap = {} as Record<Attr, number>
  ATTRS.forEach((a, i) => {
    base[a] = row[i] + (CLASS_BONUS[c][a] ?? 0)
    cap[a] = caps?.[i] ?? DEFAULT_CAP
  })
  return { base, cap }
}

/** Finns ras-klass-kombinationen i spelet? Okänt (ingen taktabell för rasen) räknas som ja. */
export function comboKnown(race: string | null | undefined, cls: string | null | undefined): boolean {
  const r = raceCode(race)
  const c = cls?.toUpperCase() ?? ''
  return !r || !CAPS[r] || !!CAPS[r][c]
}

export function pointsUsed(p: StatPoints): number {
  return ATTRS.reduce((s, a) => s + (p[a] ?? 0), 0)
}

/** Grund + placerade poäng, per attribut. */
export function withPoints(b: BaseStats, p: StatPoints): Record<Attr, number> {
  const out = {} as Record<Attr, number>
  for (const a of ATTRS) out[a] = b.base[a] + (p[a] ?? 0)
  return out
}

/** Kan en poäng till läggas på attributet? */
export function canAdd(b: BaseStats, p: StatPoints, a: Attr): boolean {
  return pointsUsed(p) < BONUS_POINTS && b.base[a] + (p[a] ?? 0) < b.cap[a]
}

/** Tvättar poäng från databasen: bara kända attribut, heltal ≥ 0, högst 10 totalt. */
export function cleanPoints(raw: unknown): StatPoints {
  const out: StatPoints = {}
  if (!raw || typeof raw !== 'object') return out
  let left = BONUS_POINTS
  for (const a of ATTRS) {
    const v = Math.min(left, Math.max(0, Math.floor(Number((raw as Record<string, unknown>)[a]) || 0)))
    if (v > 0) {
      out[a] = v
      left -= v
    }
  }
  return out
}

/** Grund + poäng per attribut för statsrutan, eller null om grundstats saknas. */
export function baseFor(race: string | null, cls: string | null, points: unknown): Record<string, number> | null {
  const b = baseStats(race, cls)
  return b ? withPoints(b, cleanPoints(points)) : null
}
