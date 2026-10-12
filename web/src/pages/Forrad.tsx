import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { HolderBadge, NoDropBadge, StatusBadge } from '../components/Badges'
import { ItemTooltip } from '../components/ItemTooltip'
import { CLASSES, SLOTS, STATUSES, STATUS_LABELS, STAT_LABELS, statLabel, weaponRatio } from '../lib/constants'
import { isNoDrop, itemScore } from '../lib/items'
import { useStore } from '../lib/store'
import type { Item } from '../lib/types'

type Sort = 'nyast' | 'namn' | 'ac' | 'poang' | 'ratio' | `stat:${string}`

function parseMins(s: string | null): [string, number][] {
  if (!s) return []
  return s.split(',').map((p) => p.split(':')).filter((p) => p.length === 2).map(([k, v]) => [k, Number(v) || 0])
}

export function Forrad() {
  const { items, characters, loading } = useStore()
  const [params, setParams] = useSearchParams()
  const [newStat, setNewStat] = useState('')

  const q = params.get('q') ?? ''
  const slot = params.get('slot') ?? ''
  const cls = params.get('klass') ?? ''
  const holder = params.get('karaktar') ?? ''
  const status = params.get('status') ?? 'aktiva'
  const tradeOnly = params.get('trade') === '1'
  const sort = (params.get('sort') ?? 'nyast') as Sort
  const mins = parseMins(params.get('min'))

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
  const allClasses = useMemo(() => {
    const s = new Set(Object.keys(CLASSES))
    items.forEach((i) => i.classes.forEach((x) => x !== 'ALL' && s.add(x)))
    return [...s].sort()
  }, [items])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = items.filter((i) => {
      if (needle && ![i.name, i.effect, i.description, i.notes].some((t) => t?.toLowerCase().includes(needle))) return false
      if (slot && !i.slots.includes(slot)) return false
      if (cls && !(i.classes.includes(cls) || i.classes.includes('ALL'))) return false
      if (holder && i.holder_id !== holder && i.lent_to_id !== holder) return false
      if (status === 'aktiva' && i.status === 'sald') return false
      if (status !== 'aktiva' && status !== 'alla' && i.status !== status) return false
      if (tradeOnly && isNoDrop(i)) return false
      for (const [k, v] of mins) {
        const val = k === 'AC' ? i.ac : i.stats[k]
        if ((val ?? 0) < v) return false
      }
      return true
    })
    const by = (f: (i: Item) => number) => (a: Item, b: Item) => f(b) - f(a)
    if (sort === 'namn') out.sort((a, b) => a.name.localeCompare(b.name, 'sv'))
    else if (sort === 'ac') out.sort(by((i) => i.ac ?? -999))
    else if (sort === 'poang') out.sort(by(itemScore))
    else if (sort === 'ratio') out.sort(by((i) => weaponRatio(i.stats) ?? -1))
    else if (sort.startsWith('stat:')) {
      const k = sort.slice(5)
      out.sort(by((i) => i.stats[k] ?? -999))
    }
    return out
  }, [items, q, slot, cls, holder, status, tradeOnly, mins, sort])

  const activeFilters = [...params.keys()].filter((k) => k !== 'sort').length

  return (
    <div className="page forrad">
      <aside className="filters panel">
        <h2 className="panel-title">Sök &amp; filtrera</h2>
        <label className="field">
          <span>Sök</span>
          <input type="search" value={q} onChange={(e) => update('q', e.target.value || null)} placeholder="Namn, effect, text…" />
        </label>
        <label className="field">
          <span>Slot</span>
          <select value={slot} onChange={(e) => update('slot', e.target.value || null)}>
            <option value="">Alla</option>
            {allSlots.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Kan användas av klass</span>
          <select value={cls} onChange={(e) => update('klass', e.target.value || null)}>
            <option value="">Alla</option>
            {allClasses.map((c) => <option key={c} value={c}>{c}{CLASSES[c] ? ` – ${CLASSES[c]}` : ''}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Karaktär</span>
          <select value={holder} onChange={(e) => update('karaktar', e.target.value || null)}>
            <option value="">Alla</option>
            {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select value={status} onChange={(e) => update('status', e.target.value === 'aktiva' ? null : e.target.value)}>
            <option value="aktiva">Alla utom sålda</option>
            <option value="alla">Alla</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={tradeOnly} onChange={(e) => update('trade', e.target.checked ? '1' : null)} />
          Bara tradebara (dölj NODROP)
        </label>

        <div className="field">
          <span>Minsta värde</span>
          {mins.map(([k, v], idx) => (
            <div key={k} className="min-row">
              <span className="min-row__key">{k === 'AC' ? 'AC' : statLabel(k)} ≥</span>
              <input
                inputMode="numeric"
                value={v}
                onChange={(e) => setMins(mins.map((m, j) => (j === idx ? [k, Number(e.target.value) || 0] : m)))}
              />
              <button className="icon-btn" aria-label="Ta bort" onClick={() => setMins(mins.filter((_, j) => j !== idx))}>×</button>
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
            <option value="">+ Lägg till stat-filter</option>
            <option value="AC">AC</option>
            {allStats.map((s) => <option key={s} value={s}>{statLabel(s)}</option>)}
          </select>
        </div>

        <label className="field">
          <span>Sortera</span>
          <select value={sort} onChange={(e) => update('sort', e.target.value === 'nyast' ? null : e.target.value)}>
            <option value="nyast">Senast tillagda</option>
            <option value="namn">Namn</option>
            <option value="ac">AC</option>
            <option value="poang">Bäst totalt (AC + stats)</option>
            <option value="ratio">Vapenratio (DMG/DLY)</option>
            {allStats.map((s) => <option key={s} value={`stat:${s}`}>{statLabel(s)}</option>)}
          </select>
        </label>
        {activeFilters > 0 && (
          <button className="btn btn--ghost" onClick={() => setParams({}, { replace: true })}>Rensa filter</button>
        )}
      </aside>

      <section className="results">
        <div className="results__head">
          <span>{loading ? 'Laddar…' : `${filtered.length} av ${items.length} items`}</span>
          <Link to="/ny" className="btn btn--primary">+ Lägg till item</Link>
        </div>
        {!loading && items.length === 0 && (
          <div className="panel empty">
            <p>Förrådet är tomt.</p>
            <Link to="/ny" className="btn btn--primary">Lägg in ert första item</Link>
          </div>
        )}
        <div className="grid">
          {filtered.map((i) => (
            <Link key={i.id} to={`/item/${i.id}`} className="card">
              <ItemTooltip item={i} compact />
              <div className="card__meta">
                <HolderBadge item={i} />
                <StatusBadge item={i} />
                <NoDropBadge item={i} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
