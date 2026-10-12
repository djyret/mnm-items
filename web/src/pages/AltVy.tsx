import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClassIcon } from '../components/ClassIcon'
import { ItemCard } from '../components/ItemCard'
import { LoanRequest } from '../components/LoanRequest'
import { CLASSES, SLOTS, slotIcon } from '../lib/constants'
import { canUse, isNoDrop, itemScore } from '../lib/items'
import { useStore } from '../lib/store'

/** Allt i förrådet en viss karaktär kan bära, grupperat per slot. */
export function AltVy() {
  const { characters, items } = useStore()
  const [params, setParams] = useSearchParams()
  const charId = params.get('karaktar') ?? ''
  const char = characters.find((c) => c.id === charId)
  const [picked, setPicked] = useState<Set<string>>(new Set())

  // Byt karaktär = börja om med valen
  useEffect(() => setPicked(new Set()), [charId])

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const groups = useMemo(() => {
    if (!char) return []
    const usable = items.filter((i) => {
      if (i.status === 'sald') return false
      if (!canUse(i, char)) return false
      const own = i.holder_id === char.id || i.lent_to_id === char.id
      if (!own && isNoDrop(i)) return false // NODROP på annan karaktär går inte att få
      if (!own && i.status === 'reserverad') return false
      return true
    })
    const bySlot = new Map<string, typeof usable>()
    for (const i of usable) {
      for (const s of i.slots.length ? i.slots : ['ÖVRIGT']) {
        if (!bySlot.has(s)) bySlot.set(s, [])
        bySlot.get(s)!.push(i)
      }
    }
    const order = (s: string) => {
      const n = SLOTS.indexOf(s)
      return n === -1 ? 999 : n
    }
    return [...bySlot.entries()]
      .sort(([a], [b]) => order(a) - order(b))
      .map(([slot, list]) => [slot, list.sort((a, b) => itemScore(b) - itemScore(a))] as const)
  }, [char, items])

  return (
    <div className="page">
      <h1 className="page-title">Vad kan min alt använda?</h1>
      <div className="panel alt-pick">
        <h2 className="panel-title">Välj karaktär</h2>
        <div className="char-list">
          {characters.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`char-row${c.id === charId ? ' is-active' : ''}`}
              onClick={() => setParams({ karaktar: c.id }, { replace: true })}
            >
              <span className="char-row__icon"><ClassIcon code={c.class} size={40} /></span>
              <span className="char-row__label">
                <span className="char-row__name">{c.name}</span>
                <span className="char-row__sub">
                  {[c.class && (CLASSES[c.class] || c.class), c.level && `lvl ${c.level}`].filter(Boolean).join(' · ') || 'Ingen klass'}
                </span>
              </span>
            </button>
          ))}
        </div>
        {char && !char.class && (
          <p className="note">
            {char.name} saknar klass, så alla items visas. <Link to="/karaktarer">Ange klass</Link> för en bättre lista.
          </p>
        )}
        {char?.class && (
          <p className="note">
            Visar items för {CLASSES[char.class] || char.class}
            {char.race ? ` (${char.race})` : ''} – sorterat på AC + stats. NODROP-items på andra karaktärer är bortfiltrerade.
          </p>
        )}
      </div>

      {char && groups.length === 0 && <div className="panel empty">Inget i förrådet passar {char.name} just nu.</div>}
      {char && groups.length > 0 && (
        <p className="note">Bocka i rutan uppe till höger på de items {char.name} vill låna. Sedan skapas ett meddelande till Discord längst ner.</p>
      )}

      {groups.map(([slot, list]) => (
        <section key={slot} className="slot-group">
          <h2 className="slot-group__title">
            <img src={slotIcon(slot)} alt="" />
            {slot} <small>{list.length}</small>
          </h2>
          <div className="grid">
            {list.map((i) => {
              const own = i.holder_id === char!.id
              return (
                <ItemCard
                  key={i.id}
                  item={i}
                  own={own}
                  selected={picked.has(i.id)}
                  onSelect={own ? undefined : toggle}
                />
              )
            })}
          </div>
        </section>
      ))}
      {char && picked.size > 0 && (
        <>
          <div id="lan" />
          <LoanRequest
            alt={char}
            items={items.filter((it) => picked.has(it.id))}
            onClear={() => setPicked(new Set())}
          />
          <div className="loan-bar">
            <span>{picked.size} {picked.size === 1 ? 'item valt' : 'items valda'} för {char.name}</span>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => document.getElementById('lan')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Visa Discord-meddelande
            </button>
          </div>
        </>
      )}
    </div>
  )
}
