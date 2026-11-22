// Grundstats i Armory: rasens och klassens värden plus de 10 bonuspoäng spelaren placerar när
// karaktären skapas. Siffrorna kommer från wikins Character Planner (lib/basestats.ts).
import { useState } from 'react'
import {
  ATTRS, BONUS_POINTS, RACES, baseStats, canAdd, cleanPoints, comboKnown, pointsUsed, raceCode,
  withPoints, type Attr, type StatPoints,
} from '../lib/basestats'
import { useI18n } from '../lib/i18n'
import { WIKI_HOME } from '../lib/wiki'

export function BaseStatsPanel({ race, cls, points, editable, onSave }: {
  race: string | null
  cls: string | null
  points: unknown
  editable: boolean
  onSave: (p: StatPoints) => Promise<string | null>
}) {
  const { t } = useI18n()
  const saved = cleanPoints(points)
  const [draft, setDraft] = useState<StatPoints | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const p = draft ?? saved
  const b = baseStats(race, cls)

  if (!b) {
    const code = raceCode(race)
    const why = !race || !cls
      ? t('armory.base.needRaceClass')
      : code ? t('armory.base.noData', { race: RACES[code] }) : t('armory.base.unknownRace', { race })
    return <div className="panel basestats"><p className="note">{why}</p></div>
  }

  const left = BONUS_POINTS - pointsUsed(p)
  const total = withPoints(b, p)
  const change = (a: Attr, d: number) => {
    const next = { ...p, [a]: Math.max(0, (p[a] ?? 0) + d) }
    if (!next[a]) delete next[a]
    setDraft(next)
  }
  async function save() {
    setBusy(true)
    setError(null)
    const err = await onSave(p)
    setBusy(false)
    if (err) setError(err)
    else setDraft(null)
  }

  return (
    <details className="panel basestats" open={draft !== null || undefined}>
      <summary>
        {t('armory.base.title')}
        <small>{left > 0 ? t('armory.base.left', { n: left }) : t('armory.base.allPlaced')}</small>
      </summary>
      {!comboKnown(race, cls) && <p className="warn">{t('armory.base.badCombo')}</p>}
      {error && <div className="alert" role="alert">{error}</div>}
      <table className="basestats__table">
        <thead>
          <tr>
            <th scope="col">{t('armory.base.attr')}</th>
            <th scope="col">{t('armory.base.base')}</th>
            <th scope="col">{t('armory.base.points')}</th>
            <th scope="col">{t('armory.base.total')}</th>
          </tr>
        </thead>
        <tbody>
          {ATTRS.map((a) => (
            <tr key={a}>
              <th scope="row">{a}</th>
              <td>{b.base[a]}</td>
              <td className="basestats__points">
                {editable && (
                  <button type="button" className="btn btn--small btn--ghost" aria-label={t('armory.base.minus', { attr: a })}
                    disabled={busy || !p[a]} onClick={() => change(a, -1)}>−</button>
                )}
                <span>{p[a] ?? 0}</span>
                {editable && (
                  <button type="button" className="btn btn--small btn--ghost" aria-label={t('armory.base.plus', { attr: a })}
                    disabled={busy || !canAdd(b, p, a)} onClick={() => change(a, 1)}>+</button>
                )}
              </td>
              <td title={t('armory.base.capHint', { cap: b.cap[a] })}>{total[a]} <small>/ {b.cap[a]}</small></td>
            </tr>
          ))}
        </tbody>
      </table>
      {editable && draft !== null && (
        <div className="actions">
          <button type="button" className="btn btn--small btn--primary" disabled={busy} onClick={save}>{t('common.save')}</button>
          <button type="button" className="btn btn--small btn--ghost" disabled={busy} onClick={() => setDraft(null)}>{t('common.cancel')}</button>
        </div>
      )}
      <small className="wiki-credit">
        {t('armory.base.source')} <a href={`${WIKI_HOME}/character-planner`} target="_blank" rel="noreferrer">Monsters and Memories Wiki</a>
      </small>
    </details>
  )
}
