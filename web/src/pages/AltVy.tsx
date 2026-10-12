import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { HolderBadge, StatusBadge } from '../components/Badges'
import { ItemTooltip } from '../components/ItemTooltip'
import { CLASSES, SLOTS } from '../lib/constants'
import { canUse, isNoDrop, itemScore } from '../lib/items'
import { useStore } from '../lib/store'

/** Allt i förrådet en viss karaktär kan bära, grupperat per slot. */
export function AltVy() {
  const { characters, items } = useStore()
  const [params, setParams] = useSearchParams()
  const charId = params.get('karaktar') ?? ''
  const char = characters.find((c) => c.id === charId)

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
        <label className="field">
          <span>Karaktär</span>
          <select value={charId} onChange={(e) => setParams(e.target.value ? { karaktar: e.target.value } : {}, { replace: true })}>
            <option value="">— Välj karaktär —</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.class ? ` (${c.class})` : ''}</option>
            ))}
          </select>
        </label>
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

      {groups.map(([slot, list]) => (
        <section key={slot} className="slot-group">
          <h2 className="slot-group__title">{slot} <small>{list.length}</small></h2>
          <div className="grid">
            {list.map((i) => (
              <Link key={i.id} to={`/item/${i.id}`} className={`card${i.holder_id === char!.id ? ' card--own' : ''}`}>
                <ItemTooltip item={i} compact />
                <div className="card__meta">
                  <HolderBadge item={i} />
                  <StatusBadge item={i} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
