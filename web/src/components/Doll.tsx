// Karaktärsfönstret i Armory: slotplatserna runt porträttet som i spelet. Delas av gänget och gästerna.
import type { ReactNode } from 'react'
import { DOLL, slotBase, slotLabel } from '../lib/armory'
import { itemIconUrl } from '../lib/items'
import type { Item } from '../lib/types'
import type { useItemHover } from './ItemHover'
import { ItemIcon } from './ItemTooltip'

export function DollGrid({ slot, portrait, className = '' }: {
  slot: (s: string) => ReactNode
  portrait: ReactNode
  className?: string
}) {
  return (
    <div className={`panel doll ${className}`.trim()}>
      <div className="doll__row doll__row--top">{DOLL.top.map(slot)}</div>
      <div className="doll__col doll__col--left">{DOLL.left.map(slot)}</div>
      {portrait}
      <div className="doll__col doll__col--right">{DOLL.right.map(slot)}</div>
      <div className="doll__row doll__row--bottom">{DOLL.bottom.map(slot)}</div>
    </div>
  )
}

/** En slot som knapp: klick väljer den, hover visar item-rutan. */
export function DollSlot({ slot, item, selected, onSelect, hover }: {
  slot: string
  item: Item | undefined
  selected: boolean
  onSelect: () => void
  hover: ReturnType<typeof useItemHover>
}) {
  return (
    <button
      type="button"
      className={`doll__slot${item ? ' doll__slot--filled' : ''}${selected ? ' doll__slot--selected' : ''}`}
      aria-pressed={selected}
      title={item ? undefined : slotLabel(slot)}
      {...hover.bind(item)}
      // Klicket öppnar slotpanelen med samma item; rutan behövs inte längre
      onClick={() => { hover.hide(); onSelect() }}
    >
      <ItemIcon src={item ? itemIconUrl(item) : null} slot={slotBase(slot)} size="sm" />
      <span className="doll__label">{item ? item.name : slotLabel(slot)}</span>
    </button>
  )
}
