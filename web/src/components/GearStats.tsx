// Statsrutan i spelets stil (Health/Mana/End/AC, Statistik, Resistenser): bara bonus från gear.
// Används i Armory och på startsidans karaktärsblad.
import { statHelp } from '../lib/constants'
import { useI18n } from '../lib/i18n'
import type { Item } from '../lib/types'

// Samma uppställning som spelets karaktärsfönster: två kolumner per block
const VITALS = ['HP', 'MANA', 'END', 'AC'] as const
const ATTRS = [['STR', 'STA', 'AGI', 'DEX'], ['INT', 'WIS', 'CHA']] as const
const RESISTS = [['SV_COLD', 'SV_CORRUPTION', 'SV_DISEASE', 'SV_ELEC'], ['SV_FIRE', 'SV_HOLY', 'SV_MAGIC', 'SV_POISON']] as const
const SHORT: Record<string, string> = {
  SV_COLD: 'Cold', SV_CORRUPTION: 'Corr', SV_DISEASE: 'Dis', SV_ELEC: 'Elec',
  SV_FIRE: 'Fire', SV_HOLY: 'Holy', SV_MAGIC: 'Mag', SV_POISON: 'Poi',
  HP: 'Health', MANA: 'Mana', END: 'Endurance', AC: 'Armor Class',
}

function sumStats(worn: Item[]): Record<string, number> {
  const totals: Record<string, number> = { AC: worn.reduce((s, i) => s + (i.ac ?? 0), 0) }
  for (const i of worn) {
    // Enchanten står skild från grundstatsen i spelet och läggs ovanpå
    for (const [k, v] of [...Object.entries(i.stats), ...Object.entries(i.enchant_stats ?? {})]) totals[k] = (totals[k] ?? 0) + v
  }
  return totals
}

/** Statsrutan. Med compare (önskeset) visas skillnaden mot det karaktären har på sig nu. */
export function BonusPanel({ worn, compare }: { worn: Item[]; compare?: Item[] }) {
  const { t, lang } = useI18n()
  const totals = sumStats(worn)
  const base = compare ? sumStats(compare) : null
  const cell = (k: string) => {
    const v = totals[k] ?? 0
    const diff = base ? v - (base[k] ?? 0) : 0
    return (
      <div key={k} className="gstats__row" title={statHelp(k, lang)}>
        <dt>{SHORT[k] ?? k}</dt>
        <dd className={v > 0 ? 'gstats__up' : v < 0 ? 'gstats__down' : undefined}>
          {diff !== 0 && <small className={`gstats__diff ${diff > 0 ? 'gstats__up' : 'gstats__down'}`}>{diff > 0 ? `+${diff}` : diff}</small>}
          {v}
        </dd>
      </div>
    )
  }
  return (
    <div className="panel gstats">
      <dl className="gstats__vitals">{VITALS.map(cell)}</dl>
      <h2 className="gstats__head">{t('armory.stats')}</h2>
      <div className="gstats__grid">{ATTRS.map((col) => <dl key={col[0]}>{col.map(cell)}</dl>)}</div>
      <h2 className="gstats__head">{t('armory.resists')}</h2>
      <div className="gstats__grid">{RESISTS.map((col) => <dl key={col[0]}>{col.map(cell)}</dl>)}</div>
      <small className="bonus__note">{t(compare ? 'armory.sets.bonusNote' : 'armory.bonusNote', { count: worn.length })}</small>
    </div>
  )
}

/**
 * Kort version för startsidans karaktärsblad: Health, Mana och AC alltid, sedan bara de
 * attribut och resistenser som gearen faktiskt ger. Hela rutan finns i Armory.
 */
export function GearSummary({ worn }: { worn: Item[] }) {
  const { t, lang } = useI18n()
  const totals = sumStats(worn)
  const extra = [...ATTRS.flat(), ...RESISTS.flat(), 'END'].filter((k) => (totals[k] ?? 0) !== 0)
  const cell = (k: string) => {
    const v = totals[k] ?? 0
    return (
      <div key={k} className="gstats__row" title={statHelp(k, lang)}>
        <dt>{k === 'AC' ? 'AC' : SHORT[k] ?? k}</dt>
        <dd className={v > 0 ? 'gstats__up' : v < 0 ? 'gstats__down' : undefined}>{v > 0 ? `+${v}` : v}</dd>
      </div>
    )
  }
  return (
    <div className="gstats gsum">
      <dl className="gsum__vitals">{(['HP', 'MANA', 'AC'] as const).map(cell)}</dl>
      {extra.length > 0 && <dl className="gsum__extra">{extra.map(cell)}</dl>}
      <small className="bonus__note">{t('armory.bonusNote', { count: worn.length })}</small>
    </div>
  )
}
