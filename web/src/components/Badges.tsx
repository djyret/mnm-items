import { STATUS_LABELS } from '../lib/constants'
import { useStore } from '../lib/store'
import type { Item } from '../lib/types'

export function StatusBadge({ item }: { item: Item }) {
  const { charById } = useStore()
  const target =
    item.status === 'utlanad' || item.status === 'reserverad'
      ? charById(item.lent_to_id)?.name
      : item.status === 'sald'
        ? item.sold_to
        : null
  return (
    <span className={`badge badge--${item.status}`}>
      {STATUS_LABELS[item.status]}
      {target ? ` → ${target}` : ''}
    </span>
  )
}

export function HolderBadge({ item }: { item: Item }) {
  const { charById } = useStore()
  const holder = charById(item.holder_id)
  return <span className="badge badge--holder">{holder ? holder.name : 'Ingen ägare'}</span>
}

