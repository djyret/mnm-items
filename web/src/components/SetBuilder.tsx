// Setbyggaren: spelaren sätter vikter per stat, och det bästa itemet per slot väljs ur wikiindexet.
// Resultatet läggs in i det önskeset som är öppet. Används av både gängets och gästernas Armory.
import { useEffect, useState } from 'react'
import { slotBase, slotLabel } from '../lib/armory'
import { raceCode } from '../lib/basestats'
import { useI18n } from '../lib/i18n'
import { WEIGHT_KEYS, buildSet, canDualWield, presetFor, zonesIn, type SetPick, type WeightKey, type Weights } from '../lib/setbuilder'
import type { Item } from '../lib/types'
import { indexAsItem, loadGear, type WikiIndexItem } from '../lib/wikiindex'
import { useItemHover } from './ItemHover'
import { ItemIcon } from './ItemTooltip'
import { WikiCredit } from './Wiki'

const storeKey = (cls: string | null) => `mnm:setbuilder:${cls ?? 'any'}`

function loadWeights(cls: string | null): Weights {
  const preset = presetFor(cls)
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey(cls)) ?? 'null') as Partial<Weights> | null
    if (saved) for (const k of WEIGHT_KEYS) if (typeof saved[k] === 'number' && saved[k]! >= 0) preset[k] = saved[k]!
  } catch {
    /* privat läge eller trasigt värde: klassens förval */
  }
  return preset
}

export function SetBuilder({ cls, race, level, setName, current, onApply, onClose }: {
  cls: string | null
  race: string | null
  level: number | null
  setName: string
  /** Det som redan ligger i settet, per slot */
  current: Map<string, Item>
  onApply: (picks: SetPick[]) => Promise<string | null>
  onClose: () => void
}) {
  const { t } = useI18n()
  const hover = useItemHover()
  const [pool, setPool] = useState<WikiIndexItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [weights, setWeights] = useState<Weights>(() => loadWeights(cls))
  const [onlyEmpty, setOnlyEmpty] = useState(current.size > 0)
  const [knownSource, setKnownSource] = useState(false)
  const [zones, setZones] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    loadGear(cls).then((p) => live && setPool(p), (e: Error) => live && setLoadError(e.message))
    return () => { live = false }
  }, [cls])

  const setWeight = (k: WeightKey, v: number) => {
    const next = { ...weights, [k]: Math.max(0, Math.min(20, v || 0)) }
    setWeights(next)
    try {
      localStorage.setItem(storeKey(cls), JSON.stringify(next))
    } catch {
      /* sparas bara den här gången */
    }
  }
  const resetWeights = () => {
    setWeights(presetFor(cls))
    try {
      localStorage.removeItem(storeKey(cls))
    } catch {
      /* inget sparat */
    }
  }

  const keep = new Map(onlyEmpty ? [...current].map(([s, i]) => [s, { wiki_id: i.wiki_id, flags: i.flags }]) : [])
  const picks = pool
    ? buildSet(pool, { cls, race: raceCode(race), level, weights, keep, knownSource, zones: zones.split(',') })
    : []
  const suggestions = pool ? zonesIn(pool).slice(0, 200) : []

  async function apply() {
    setBusy(true)
    setError(null)
    const err = await onApply(picks)
    setBusy(false)
    if (err) setError(err)
    else onClose()
  }

  return (
    <section className="panel setbuilder" aria-labelledby="setbuilder-title">
      {hover.tip}
      <h2 className="panel-title" id="setbuilder-title">{t('builder.title')}</h2>
      <p className="note">{t('builder.intro')}</p>
      {!canDualWield(cls, level) && <p className="note">{t('builder.noDual')}</p>}

      <fieldset className="setbuilder__weights">
        <legend>{t('builder.weights')}</legend>
        {WEIGHT_KEYS.map((k) => (
          <label key={k} className="setbuilder__weight">
            <span title={t(`builder.w.${k}.help`)}>{t(`builder.w.${k}`)}</span>
            <input type="number" inputMode="decimal" min={0} max={20} step={0.5} value={weights[k]}
              onChange={(e) => setWeight(k, Number(e.target.value))} />
          </label>
        ))}
        <button type="button" className="btn btn--small btn--ghost" onClick={resetWeights}>{t('builder.preset')}</button>
      </fieldset>

      <div className="setbuilder__options">
        <label className="check">
          <input type="checkbox" checked={onlyEmpty} onChange={(e) => setOnlyEmpty(e.target.checked)} /> {t('builder.onlyEmpty')}
        </label>
        <label className="check">
          <input type="checkbox" checked={knownSource} onChange={(e) => setKnownSource(e.target.checked)} /> {t('builder.knownSource')}
        </label>
        <label className="field">
          <span>{t('builder.zones')}</span>
          <input list="setbuilder-zones" value={zones} onChange={(e) => setZones(e.target.value)} placeholder={t('builder.zonesPlaceholder')} />
          <datalist id="setbuilder-zones">{suggestions.map((z) => <option key={z} value={z} />)}</datalist>
        </label>
      </div>

      {loadError && <div className="alert" role="alert">{loadError}</div>}
      {pool === null && !loadError && <p className="note">{t('builder.loading')}</p>}
      {pool !== null && pool.length === 0 && <p className="note">{t('builder.emptyIndex')}</p>}
      {pool !== null && pool.length > 0 && (
        <>
          <h3 className="armory__sub">{t('builder.result', { n: picks.length, total: pool.length })}</h3>
          {picks.length === 0 ? <p className="note">{t('builder.noPicks')}</p> : (
            <ul className="armory__list armory__list--wide setbuilder__result">
              {picks.map((p) => (
                <li key={p.slot}>
                  <span className="armory__slotname">{slotLabel(p.slot)}</span>
                  <ItemIcon src={p.item.icon} slot={slotBase(p.slot)} size="sm" />
                  <a href={p.item.url} target="_blank" rel="noreferrer" {...hover.bind(indexAsItem(p.item, p.slot))}>{p.item.name}</a>
                  <small>{[p.item.zones.slice(0, 2).join(', '), t('builder.score', { n: p.score })].filter(Boolean).join(' · ')}</small>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {error && <div className="alert" role="alert">{error}</div>}
      <div className="actions">
        <button type="button" className="btn btn--primary" disabled={busy || picks.length === 0} onClick={apply}>
          {t('builder.apply', { name: setName })}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onClose}>{t('builder.close')}</button>
      </div>
      <WikiCredit />
    </section>
  )
}
