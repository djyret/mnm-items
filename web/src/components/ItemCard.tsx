import { Link } from 'react-router-dom'
import { STATUS_LABELS } from '../lib/constants'
import { isNoDrop } from '../lib/items'
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
export function ItemCard({ item, own = false }: { item: Item; own?: boolean }) {
  const { charById } = useStore()
  const holder = charById(item.holder_id)
  const target =
    item.status === 'utlanad' || item.status === 'reserverad'
      ? charById(item.lent_to_id)?.name
      : item.status === 'sald'
        ? item.sold_to
        : null

  return (
    <Link to={`/item/${item.id}`} className={`frame card${own ? ' card--own' : ''}`}>
      <div className="frame__title">{item.name}</div>
      <ItemTooltip item={item} compact iconUrl={imageUrl(item.icon_path)} />
      <div className="card__foot">
        <span className="card__from">
          <PersonIcon />
          Från: <b>{holder?.name ?? '—'}</b>
        </span>
        <span className="card__tags">
          {item.price_cp != null && <Money cp={item.price_cp} />}
          {isNoDrop(item) && <span className="badge badge--nodrop" title="Kan inte tradeas">NODROP</span>}
          <span className={`badge badge--${item.status}`}>
            {STATUS_LABELS[item.status]}
            {target ? ` → ${target}` : ''}
          </span>
        </span>
      </div>
    </Link>
  )
}
