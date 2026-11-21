import { Link } from 'react-router-dom'
import { statusLabel } from '../lib/constants'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import { itemIconUrl } from '../lib/items'
import type { Item } from '../lib/types'
import { ItemTooltip } from './ItemTooltip'
import { Money } from './Money'
import { Icon } from './Icon'

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
  const { t, lang } = useI18n()
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
            aria-label={t('forradet.card.select', { name: item.name })}
            tabIndex={0}
            className={`card__check${selected ? ' is-on' : ''}`}
            title={selected ? t('forradet.card.selected') : t('forradet.card.selectForLoan')}
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
      <ItemTooltip item={item} compact iconUrl={itemIconUrl(item)} />
      <div className="card__foot">
        <span className="card__from">
          <PersonIcon />
          {t('forradet.card.from')} <b>{holder?.name ?? '—'}</b>
        </span>
        <span className="card__tags">
          {item.wiki_url && (
            <span
              role="link"
              tabIndex={0}
              className="card__wiki"
              title={t('wiki.openItem', { name: item.name })}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                window.open(item.wiki_url!, '_blank', 'noopener')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  window.open(item.wiki_url!, '_blank', 'noopener')
                }
              }}
            >
              Wiki
            </span>
          )}
          {item.status === 'sald'
            ? item.sold_price_cp != null && <Money cp={item.sold_price_cp} />
            : item.price_cp != null && <span title={t('forradet.price.guide')}><Money cp={item.price_cp} /></span>}
          <span className={`badge badge--${item.status}`}>
            {statusLabel(item.status, lang)}
            {target && <><Icon name="hoger" size={12} /> {target}</>}
          </span>
        </span>
      </div>
    </Link>
  )
}
