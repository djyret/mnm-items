// Item-rutan som svävar bredvid ett item när musen står över det (dockan, Armorys listor, Hem).
// Samma fönster som vid import, så man ser statsen utan att klicka. Bara för mus och tangentbordsfokus:
// på pekskärm finns ingen hover, där gäller klick som förut.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { itemIconUrl } from '../lib/items'
import type { Item } from '../lib/types'
import { ItemTooltip } from './ItemTooltip'

type Hover = { item: Item; rect: DOMRect }

const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches

/**
 * `bind(item)` ger händelserna att sprida på elementet som pekar på itemet, `tip` renderas någonstans
 * i komponenten (den hamnar i body via portal). Tomt item ger inga händelser.
 */
export function useItemHover() {
  const [hover, setHover] = useState<Hover | null>(null)
  const hide = useCallback(() => setHover(null), [])

  // Rutan står fast i fönstret: skrollar man, eller trycker Esc, försvinner den
  useEffect(() => {
    if (!hover) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide() }
    window.addEventListener('scroll', hide, { passive: true, capture: true })
    window.addEventListener('resize', hide)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', hide, { capture: true })
      window.removeEventListener('resize', hide)
      window.removeEventListener('keydown', onKey)
    }
  }, [hover, hide])

  const bind = (item: Item | null | undefined) => {
    if (!item) return {}
    return {
      onMouseEnter: (e: MouseEvent<HTMLElement>) => { if (canHover()) setHover({ item, rect: e.currentTarget.getBoundingClientRect() }) },
      onMouseLeave: hide,
      onFocus: (e: FocusEvent<HTMLElement>) => {
        if (e.currentTarget.matches(':focus-visible')) setHover({ item, rect: e.currentTarget.getBoundingClientRect() })
      },
      onBlur: hide,
    }
  }

  const tip = hover ? <FloatingItem key={hover.item.id} item={hover.item} anchor={hover.rect} /> : null
  return { bind, tip, hide }
}

const GAP = 10
const EDGE = 8

function FloatingItem({ item, anchor }: { item: Item; anchor: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null)

  // Till höger om itemet om det får plats, annars till vänster; alltid inom fönstret
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    let left = anchor.right + GAP
    if (left + width > window.innerWidth - EDGE) left = anchor.left - GAP - width
    left = Math.max(EDGE, Math.min(left, window.innerWidth - width - EDGE))
    const top = Math.max(EDGE, Math.min(anchor.top, window.innerHeight - height - EDGE))
    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.visibility = 'visible'
  }, [anchor])

  return createPortal(
    <div ref={ref} className="item-hover" aria-hidden="true">
      <ItemTooltip item={item} iconUrl={itemIconUrl(item)} />
    </div>,
    document.body,
  )
}
