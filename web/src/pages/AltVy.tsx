import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClassIcon } from '../components/ClassIcon'
import { ItemCard } from '../components/ItemCard'
import { LoanRequest } from '../components/LoanRequest'
import { CLASSES, SLOTS, slotIcon } from '../lib/constants'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { canUse, itemScore } from '../lib/items'
import { useStore } from '../lib/store'

/** Slotgrupp för items utan slot (inte en spelkod, bara en nyckel här). */
const NO_SLOT = '_other'

/** Allt i förrådet en viss karaktär kan bära, grupperat per slot. */
export function AltVy() {
  const { characters, items } = useStore()
  const { canEdit } = useAuth()
  const { t } = useI18n()
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
      if (!own && i.status === 'reserverad') return false
      return true
    })
    const bySlot = new Map<string, typeof usable>()
    for (const i of usable) {
      for (const s of i.slots.length ? i.slots : [NO_SLOT]) {
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
      <h1 className="page-title">{t('forradet.alt.title')}</h1>
      <div className="panel alt-pick">
        <h2 className="panel-title">{t('forradet.alt.pick')}</h2>
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
                  {[c.class && (CLASSES[c.class] || c.class), c.level && `lvl ${c.level}`].filter(Boolean).join(' · ') || t('forradet.class.none')}
                </span>
              </span>
            </button>
          ))}
        </div>
        {char && !char.class && (
          <p className="note">
            {t('forradet.alt.missingClass', { name: char.name })}{canEdit && <> <Link to="/karaktarer">{t('forradet.alt.setClass')}</Link> {t('forradet.alt.setClassRest')}</>}
          </p>
        )}
        {char?.class && (
          <p className="note">
            {t('forradet.alt.showingFor', {
              class: CLASSES[char.class] || char.class,
              race: char.race ? ` (${char.race})` : '',
            })}
          </p>
        )}
      </div>

      {char && groups.length === 0 && <div className="panel empty">{t('forradet.alt.nothing', { name: char.name })}</div>}
      {char && groups.length > 0 && (
        <p className="note">{t('forradet.alt.hint', { name: char.name })}</p>
      )}

      {groups.map(([slot, list]) => (
        <section key={slot} className="slot-group">
          <h2 className="slot-group__title">
            <img src={slotIcon(slot)} alt="" />
            {slot === NO_SLOT ? t('forradet.alt.other') : slot} <small>{list.length}</small>
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
            <span>{picked.size === 1 ? t('forradet.alt.pickedOne', { name: char.name }) : t('forradet.alt.pickedMany', { n: picked.size, name: char.name })}</span>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => document.getElementById('lan')?.scrollIntoView({ behavior: 'smooth' })}
            >
              {t('forradet.alt.showMessage')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
