import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClassPicker } from '../components/ClassIcon'
import { ItemCard } from '../components/ItemCard'
import { EditorOnly } from '../components/RequireEditor'
import { CLASSES, SLOTS, STATUSES, STAT_LABELS, statLabel, statusLabel, weaponRatio } from '../lib/constants'
import { useI18n } from '../lib/i18n'
import { itemScore } from '../lib/items'
import { useStore } from '../lib/store'
import type { Item } from '../lib/types'
import { Icon } from '../components/Icon'

type Sort = 'nyast' | 'namn' | 'ac' | 'poang' | 'ratio' | 'pris' | `stat:${string}`

function parseMins(s: string | null): [string, number][] {
  if (!s) return []
  return s.split(',').map((p) => p.split(':')).filter((p) => p.length === 2).map(([k, v]) => [k, Number(v) || 0])
}

export function Forrad() {
  const { items, characters, loading } = useStore()
  const [params, setParams] = useSearchParams()
  const [newStat, setNewStat] = useState('')
  const { t, lang, locale } = useI18n()

  const q = params.get('q') ?? ''
  const slot = params.get('slot') ?? ''
  const cls = params.get('klass') ?? ''
  const holder = params.get('karaktar') ?? ''
  const status = params.get('status') ?? 'aktiva'
  const sort = (params.get('sort') ?? 'nyast') as Sort
  const mins = parseMins(params.get('min'))
  // Från startsidans "Sedan sist": bara items som lagts in efter senaste besöket
  const sedan = params.get('sedan')
  const sedanMs = sedan ? Date.parse(sedan) : NaN

  const update = (k: string, v: string | null) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    setParams(p, { replace: true })
  }
  const setMins = (m: [string, number][]) => update('min', m.map(([k, v]) => `${k}:${v}`).join(',') || null)

  // Alla stats och slots som finns i förrådet + standardlistan
  const allStats = useMemo(() => {
    const s = new Set(Object.keys(STAT_LABELS))
    items.forEach((i) => Object.keys(i.stats).forEach((k) => s.add(k)))
    return [...s]
  }, [items])
  const allSlots = useMemo(() => {
    const s = new Set(SLOTS)
    items.forEach((i) => i.slots.forEach((x) => s.add(x)))
    return [...s]
  }, [items])
  // Bara spelets 18 klasser – felavlästa koder i datat ska inte bli egna val
  const allClasses = Object.keys(CLASSES)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = items.filter((i) => {
      if (needle && ![i.name, i.effect, i.description, i.notes].some((s) => s?.toLowerCase().includes(needle))) return false
      if (!Number.isNaN(sedanMs) && Date.parse(i.created_at) <= sedanMs) return false
      if (slot && !i.slots.includes(slot)) return false
      if (cls && !(i.classes.includes(cls) || i.classes.includes('ALL'))) return false
      if (holder && i.holder_id !== holder && i.lent_to_id !== holder) return false
      if (status === 'aktiva' && i.status === 'sald') return false
      if (status !== 'aktiva' && status !== 'alla' && i.status !== status) return false
      for (const [k, v] of mins) {
        const val = k === 'AC' ? i.ac : i.stats[k]
        if ((val ?? 0) < v) return false
      }
      return true
    })
    const by = (f: (i: Item) => number) => (a: Item, b: Item) => f(b) - f(a)
    if (sort === 'namn') out.sort((a, b) => a.name.localeCompare(b.name, lang))
    else if (sort === 'ac') out.sort(by((i) => i.ac ?? -999))
    else if (sort === 'poang') out.sort(by(itemScore))
    else if (sort === 'pris') out.sort(by((i) => i.price_cp ?? -1))
    else if (sort === 'ratio') out.sort(by((i) => weaponRatio(i.stats) ?? -1))
    else if (sort.startsWith('stat:')) {
      const k = sort.slice(5)
      out.sort(by((i) => i.stats[k] ?? -999))
    }
    return out
  }, [items, q, slot, cls, holder, status, mins, sort, lang, sedanMs])

  const activeFilters = [...params.keys()].filter((k) => k !== 'sort').length

  return (
    <div className="page forrad">
      <aside className="filters panel">
        <h2 className="panel-title">{t('forradet.filters.title')}</h2>
        <label className="field">
          <span>{t('forradet.filters.search')}</span>
          <input type="search" value={q} onChange={(e) => update('q', e.target.value || null)} placeholder={t('forradet.filters.searchPlaceholder')} />
        </label>
        <label className="field">
          <span>Slot</span>
          <select value={slot} onChange={(e) => update('slot', e.target.value || null)}>
            <option value="">{t('forradet.filters.all')}</option>
            {allSlots.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <div className="field">
          <span>{t('forradet.filters.usableBy')}{cls ? `: ${CLASSES[cls] || cls}` : ''}</span>
          <ClassPicker classes={allClasses} value={cls} onChange={(v) => update('klass', v || null)} />
        </div>
        <label className="field">
          <span>{t('forradet.filters.character')}</span>
          <select value={holder} onChange={(e) => update('karaktar', e.target.value || null)}>
            <option value="">{t('forradet.filters.all')}</option>
            {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{t('forradet.form.status')}</span>
          <select value={status} onChange={(e) => update('status', e.target.value === 'aktiva' ? null : e.target.value)}>
            <option value="aktiva">{t('forradet.filters.allButSold')}</option>
            <option value="alla">{t('forradet.filters.all')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s, lang)}</option>)}
          </select>
        </label>

        <div className="field">
          <span>{t('forradet.filters.minValue')}</span>
          {mins.map(([k, v], idx) => (
            <div key={k} className="min-row">
              <span className="min-row__key">{k === 'AC' ? 'AC' : statLabel(k)} ≥</span>
              <input
                inputMode="numeric"
                value={v}
                onChange={(e) => setMins(mins.map((m, j) => (j === idx ? [k, Number(e.target.value) || 0] : m)))}
              />
              <button className="icon-btn" aria-label={t('forradet.filters.removeMin')} onClick={() => setMins(mins.filter((_, j) => j !== idx))}><Icon name="stang" size={14} /></button>
            </div>
          ))}
          <select
            value={newStat}
            onChange={(e) => {
              const k = e.target.value
              if (k && !mins.some(([m]) => m === k)) setMins([...mins, [k, 1]])
              setNewStat('')
            }}
          >
            <option value="">{t('forradet.filters.addStat')}</option>
            <option value="AC">AC</option>
            {allStats.map((s) => <option key={s} value={s}>{statLabel(s)}</option>)}
          </select>
        </div>

        <label className="field">
          <span>{t('forradet.filters.sort')}</span>
          <select value={sort} onChange={(e) => update('sort', e.target.value === 'nyast' ? null : e.target.value)}>
            <option value="nyast">{t('forradet.sort.newest')}</option>
            <option value="namn">{t('forradet.sort.name')}</option>
            <option value="ac">AC</option>
            <option value="poang">{t('forradet.sort.best')}</option>
            <option value="ratio">{t('forradet.sort.ratio')}</option>
            <option value="pris">{t('forradet.sort.price')}</option>
            {allStats.map((s) => <option key={s} value={`stat:${s}`}>{statLabel(s)}</option>)}
          </select>
        </label>
        {activeFilters > 0 && (
          <button className="btn btn--ghost" onClick={() => setParams({}, { replace: true })}>{t('forradet.filters.clear')}</button>
        )}
      </aside>

      <section className="results">
        <div className="results__head">
          <span>{loading ? t('common.loading') : t('forradet.stash.count', { shown: filtered.length, total: items.length })}</span>
          {!Number.isNaN(sedanMs) && (
            <span className="results__since">
              {t('forradet.stash.since', { date: new Date(sedanMs).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) })}
              <button type="button" className="btn btn--small btn--ghost" onClick={() => update('sedan', null)}>{t('forradet.stash.sinceClear')}</button>
            </span>
          )}
          <EditorOnly><Link to="/ny" className="btn btn--primary">{t('forradet.stash.add')}</Link></EditorOnly>
        </div>
        {!loading && items.length === 0 && (
          <div className="panel empty">
            <p>{t('forradet.stash.empty')}</p>
            <EditorOnly><Link to="/ny" className="btn btn--primary">{t('forradet.stash.addFirst')}</Link></EditorOnly>
          </div>
        )}
        <div className="grid">
          {filtered.map((i) => <ItemCard key={i.id} item={i} />)}
        </div>
      </section>
    </div>
  )
}
