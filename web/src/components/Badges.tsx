import { statusLabel } from '../lib/constants'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { Item } from '../lib/types'
import { Icon } from './Icon'

export function StatusBadge({ item }: { item: Item }) {
  const { charById } = useStore()
  const { lang } = useI18n()
  const target =
    item.status === 'utlanad' || item.status === 'reserverad'
      ? charById(item.lent_to_id)?.name
      : item.status === 'sald'
        ? item.sold_to
        : null
  return (
    <span className={`badge badge--${item.status}`}>
      {statusLabel(item.status, lang)}
      {target && <><Icon name="hoger" size={12} /> {target}</>}
    </span>
  )
}

export function HolderBadge({ item }: { item: Item }) {
  const { charById } = useStore()
  const { t } = useI18n()
  const holder = charById(item.holder_id)
  return <span className="badge badge--holder">{holder ? holder.name : t('forradet.badge.noHolder')}</span>
}
