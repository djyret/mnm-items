// Setbyggaren: väljer det bästa itemet per slot ur wikiindexet efter vikter som spelaren sätter.
// Ren uträkning i webben (ingen AI): poäng = summan av stat × vikt. Hänsyn till klass och ras,
// LORE (bara ett av samma), de dubbla platserna (öron, handleder, fingrar), tvåhandsvapen och
// Dual Wield (vapen i sekundärhanden bara för klasser som har den).
import { EQUIP_SLOTS, fitsSlot } from './armory'
import { raceAllows, type WikiIndexItem } from './wikiindex'

export const WEIGHT_KEYS = ['STR', 'STA', 'AGI', 'DEX', 'INT', 'WIS', 'CHA', 'HP', 'MANA', 'AC', 'RESISTS', 'WEAPON'] as const
export type WeightKey = (typeof WEIGHT_KEYS)[number]
export type Weights = Record<WeightKey, number>

const RESISTS = ['SV_COLD', 'SV_CORRUPTION', 'SV_DISEASE', 'SV_ELEC', 'SV_FIRE', 'SV_HOLY', 'SV_MAGIC', 'SV_POISON']

const zero: Weights = { STR: 0, STA: 0, AGI: 0, DEX: 0, INT: 0, WIS: 0, CHA: 0, HP: 0, MANA: 0, AC: 0, RESISTS: 0, WEAPON: 0 }
const w = (p: Partial<Weights>): Weights => ({ ...zero, ...p })

// Förval per klass. HP och Mana räknas per poäng (10 HP ≈ 1 STA), vapnet efter skada per delay.
const CASTER = { STA: 1, HP: 0.1, MANA: 0.15, AC: 0.1 }
const PRESETS: Record<string, Weights> = {
  WIZ: w({ ...CASTER, INT: 3, DEX: 0.5 }),
  NEC: w({ ...CASTER, INT: 3, DEX: 0.5 }),
  ELE: w({ ...CASTER, INT: 3, STA: 1.5 }),
  ENC: w({ ...CASTER, INT: 3, CHA: 2 }),
  CLR: w({ ...CASTER, WIS: 3, STA: 1.5, AC: 0.3 }),
  DRU: w({ ...CASTER, WIS: 3, CHA: 0.5 }),
  SHM: w({ ...CASTER, WIS: 3, STA: 1.5, AC: 0.2 }),
  FTR: w({ STA: 3, STR: 1.5, AGI: 1, DEX: 0.5, AC: 1, HP: 0.15, RESISTS: 0.2, WEAPON: 0.5 }),
  PAL: w({ STA: 3, STR: 1, WIS: 1.5, AGI: 0.5, AC: 1, HP: 0.15, MANA: 0.05, RESISTS: 0.2, WEAPON: 0.4 }),
  SHD: w({ STA: 3, STR: 1, INT: 1.5, AGI: 0.5, AC: 1, HP: 0.15, MANA: 0.05, RESISTS: 0.2, WEAPON: 0.4 }),
  INQ: w({ STA: 2.5, INT: 1.5, STR: 1, AC: 0.8, HP: 0.12, MANA: 0.05, WEAPON: 0.4 }),
  ROG: w({ DEX: 2.5, AGI: 2, STR: 2, STA: 1, AC: 0.3, HP: 0.08, WEAPON: 1 }),
  MNK: w({ AGI: 2.5, DEX: 2, STR: 2, STA: 1, AC: 0.3, HP: 0.08, WEAPON: 1 }),
  ARC: w({ DEX: 3, STR: 1.5, AGI: 1, STA: 1, HP: 0.08, WEAPON: 1 }),
  RNG: w({ DEX: 2.5, STR: 1.5, AGI: 1, STA: 1, WIS: 1, HP: 0.08, MANA: 0.05, WEAPON: 0.8 }),
  BRD: w({ CHA: 2.5, DEX: 1, STR: 1, STA: 1, HP: 0.08, MANA: 0.08, WEAPON: 0.5 }),
  BST: w({ STR: 2, WIS: 1.5, AGI: 1, STA: 1, HP: 0.08, MANA: 0.05, WEAPON: 0.8 }),
  SPB: w({ INT: 2, DEX: 1.5, STR: 1, STA: 1, HP: 0.08, MANA: 0.1, WEAPON: 0.8 }),
}

export function presetFor(cls: string | null | undefined): Weights {
  return { ...(PRESETS[cls?.toUpperCase() ?? ''] ?? w({ STA: 1, STR: 1, AGI: 1, DEX: 1, INT: 1, WIS: 1, CHA: 1, HP: 0.1, MANA: 0.1, AC: 0.5 })) }
}

const WEAPON_SLOTS = new Set(['PRIMARY', 'SECONDARY', 'RANGE'])

// Klasser med Dual Wield och nivån där den låses upp, från wikins klassidor (2026-11-22).
// Övriga klasser får bara sköld eller hållet föremål i sekundärhanden.
const DUAL_WIELD: Record<string, number> = { MNK: 1, ARC: 10, BST: 10, FTR: 10, RNG: 10, ROG: 10, SPB: 10, WIZ: 20 }

/** Okänd klass begränsas inte; okänd nivå räknas som tillräcklig. */
export function canDualWield(cls: string | null | undefined, level: number | null | undefined): boolean {
  const c = cls?.toUpperCase()
  if (!c || !(c in PRESETS)) return true
  const at = DUAL_WIELD[c]
  return at !== undefined && (level == null || level >= at)
}

const isWeapon = (i: Pick<WikiIndexItem, 'stats'>) => (i.stats.DMG ?? 0) > 0

export function scoreOf(item: Pick<WikiIndexItem, 'stats' | 'ac'>, weights: Weights, slot: string): number {
  const s = item.stats
  let score = (item.ac ?? 0) * weights.AC + (s.HP ?? 0) * weights.HP + (s.MANA ?? 0) * weights.MANA
  for (const k of ['STR', 'STA', 'AGI', 'DEX', 'INT', 'WIS', 'CHA'] as const) score += (s[k] ?? 0) * weights[k]
  for (const k of RESISTS) score += (s[k] ?? 0) * weights.RESISTS
  // Skada per delay × 100 ger ungefär samma skala som stats (8/26 ≈ 31)
  if (weights.WEAPON && WEAPON_SLOTS.has(slot) && s.DMG && s.DLY) score += (s.DMG / s.DLY) * 100 * weights.WEAPON
  return Math.round(score * 10) / 10
}

export interface BuildOptions {
  cls: string | null
  race: string | null
  level: number | null
  weights: Weights
  /** Slots som redan har något och ska stå kvar (fyll bara tomma) */
  keep: Map<string, { wiki_id: string | null; flags: string[] }>
  /** Bara items där wikin vet var de kommer ifrån */
  knownSource: boolean
  /** Bara items som droppar i någon av zonerna (tom = alla) */
  zones: string[]
  /** Spelarens egna val i förslaget: slot -> wiki-id, eller null för att lämna sloten tom */
  fixed?: Map<string, string | null>
}

export interface SetPick {
  slot: string
  item: WikiIndexItem
  score: number
  /** Spelaren valde själv (inte förslagets eget) */
  fixed?: boolean
}

export interface BuildResult {
  picks: SetPick[]
  /** Alla items som passar varje öppen slot, bäst poäng först (menyn för att byta) */
  options: Map<string, SetPick[]>
}

const isLore = (flags: string[]) => flags.includes('LORE')

/**
 * Bästa itemet per slot. Girigt över alla (slot, item)-par i poängordning, vilket räcker eftersom
 * slotarna är oberoende utom för LORE-items och tvåhandsvapen, som hanteras för sig. Spelarens egna
 * val (fixed) läggs först, och resten fylls runt dem.
 */
export function buildSet(pool: WikiIndexItem[], o: BuildOptions): BuildResult {
  const zoneSet = new Set(o.zones.map((z) => z.trim().toLowerCase()).filter(Boolean))
  const usable = pool.filter((i) =>
    raceAllows(i, o.race) &&
    (!o.knownSource || i.sources.length > 0) &&
    (zoneSet.size === 0 || i.zones.some((z) => zoneSet.has(z.toLowerCase()))))

  const dual = canDualWield(o.cls, o.level)
  const byName = (a: SetPick, b: SetPick) => b.score - a.score || a.item.name.localeCompare(b.item.name)
  const slots = EQUIP_SLOTS.filter((s) => !o.keep.has(s))
  const options = new Map<string, SetPick[]>()
  for (const slot of slots) {
    const list: SetPick[] = []
    for (const item of usable) {
      if (!fitsSlot(item, slot)) continue
      if (slot === 'SECONDARY' && !dual && isWeapon(item)) continue
      list.push({ slot, item, score: scoreOf(item, o.weights, slot) })
    }
    options.set(slot, list.sort(byName))
  }

  const usedLore = new Set([...o.keep.values()].filter((k) => k.wiki_id && isLore(k.flags)).map((k) => k.wiki_id!))
  const chosen = new Map<string, SetPick>()
  const closed = new Set<string>()

  // Spelarens egna val först. Ett tvåhandsvapen i primär stänger sekundär.
  const fixed = new Map([...(o.fixed ?? [])].filter(([s]) => options.has(s)))
  const fixedPrimary = fixed.get('PRIMARY')
  const primaryItem = fixedPrimary ? options.get('PRIMARY')?.find((p) => p.item.id === fixedPrimary) : undefined
  if (primaryItem?.item.two_hand) fixed.set('SECONDARY', null)
  for (const [slot, id] of fixed) {
    closed.add(slot)
    if (id === null) continue
    const pick = options.get(slot)?.find((p) => p.item.id === id)
    if (!pick) continue
    chosen.set(slot, { ...pick, fixed: true })
    if (isLore(pick.item.flags)) usedLore.add(pick.item.id)
  }

  const open = slots.filter((s) => !closed.has(s))
  const pairs = open.flatMap((s) => options.get(s)!.filter((p) => p.score > 0)).sort(byName)
  const assign = (list: SetPick[], skip: (p: SetPick) => boolean) => {
    for (const p of list) {
      if (chosen.has(p.slot) || skip(p)) continue
      if (isLore(p.item.flags) && usedLore.has(p.item.id)) continue
      chosen.set(p.slot, p)
      if (isLore(p.item.flags)) usedLore.add(p.item.id)
    }
  }
  // Först utan tvåhandsvapen, sedan jämförs bästa tvåhandsvapnet mot primär + sekundär
  assign(pairs, (p) => p.item.two_hand)
  const twoHand = pairs.find((p) => p.slot === 'PRIMARY' && p.item.two_hand && !(isLore(p.item.flags) && usedLore.has(p.item.id)))
  if (twoHand && open.includes('PRIMARY') && open.includes('SECONDARY')) {
    const oneHand = (chosen.get('PRIMARY')?.score ?? 0) + (chosen.get('SECONDARY')?.score ?? 0)
    if (twoHand.score > oneHand) {
      chosen.set('PRIMARY', twoHand)
      chosen.delete('SECONDARY')
    }
  }
  // Tvåhandsvapen i primär (eget val eller förslagets): sekundär är tom
  if (chosen.get('PRIMARY')?.item.two_hand) chosen.delete('SECONDARY')
  return { picks: EQUIP_SLOTS.filter((s) => chosen.has(s)).map((s) => chosen.get(s)!), options }
}

/** Zoner i poolen, flest items först (för förslag i zonfältet). */
export function zonesIn(pool: WikiIndexItem[]): string[] {
  const n = new Map<string, number>()
  for (const i of pool) for (const z of i.zones) n.set(z, (n.get(z) ?? 0) + 1)
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([z]) => z)
}
