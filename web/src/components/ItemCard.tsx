import { Link } from 'react-router-dom'
import { STATUS_LABELS } from '../lib/constants'
import { useStore } from '../lib/store'
import { imageUrl } from '../lib/supabase'
import type { Item } from '../lib/types'
import { ItemTooltip } from './ItemTooltip'
import { Money } from './Money'

export function PersonIcon() {
  return (
    <svg className="person-icon" viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="5" r="3.2" />
      <path d="M1.8 15.5c.6-3.6 3.1-5.6 6.2-5.6s5.6 2 6.2 5.6z" />
    </svg>
  )
}

/** Itemkort i bronsram: namn, tooltip och fotrad med ägare och status. */
export function ItemCard({ item, own = false, selected, onSelect }: {
  item: Item
  own?: boolean
  /** Visa kryssruta när onSelect finns */
  selected?: boolean
  onSelect?: (id: string) => void
}) {
  const { charById } = useStore()
  const holder = charById(item.holder_id)
  const target =
    item.status === 'utlanad' || item.status === 'reserverad'
      ? charById(item.lent_to_id)?.name
      : item.status === 'sald'
        ? item.sold_to
        : null

  return (
    <Link to={`/item/${item.id}`} className={`frame card${own ? ' card--own' : ''}${selected ? ' card--selected' : ''}`}>
      <div className="frame__title">
        {item.name}
        {onSelect && (
          <span
            role="checkbox"
            aria-checked={!!selected}
            aria-label={`Välj ${item.name}`}
            tabIndex={0}
            className={`card__check${selected ? ' is-on' : ''}`}
            title={selected ? 'Vald – klicka för att ta bort' : 'Välj för lån'}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onSelect(item.id)
            }}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                onSelect(item.id)
              }
            }}
          />
        )}
      </div>
      <ItemTooltip item={item} compact iconUrl={imageUrl(item.icon_path)} />
      <div className="card__foot">
        <span className="card__from">
          <PersonIcon />
          Från: <b>{holder?.name ?? '—'}</b>
        </span>
        <span className="card__tags">
          {item.status === 'sald'
            ? item.sold_price_cp != null && <Money cp={item.sold_price_cp} />
            : item.price_cp != null && <span title="Riktpris"><Money cp={item.price_cp} /></span>}
          <span className={`badge badge--${item.status}`}>
            {STATUS_LABELS[item.status]}
            {target ? ` → ${target}` : ''}
          </span>
        </span>
      </div>
    </Link>
  )
}
