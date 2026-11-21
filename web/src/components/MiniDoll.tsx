// Kompakt karaktärsfönster för startsidan: samma placering som i Armory, utan etiketter.
// Varje slot är en länk till karaktärens Armory; namnet syns i title och för skärmläsare.
import { Link } from 'react-router-dom'
import { DOLL, slotBase, slotLabel } from '../lib/armory'
import { useI18n } from '../lib/i18n'
import { itemIconUrl } from '../lib/items'
import { imageUrl } from '../lib/supabase'
import type { Character, Item } from '../lib/types'
import { ClassIcon } from './ClassIcon'
import { ItemIcon } from './ItemTooltip'

export function MiniDoll({ char, worn }: { char: Character; worn: Map<string, Item> }) {
  const { t } = useI18n()
  const portrait = imageUrl(char.portrait_path)
  const to = `/karaktar/${char.id}`

  const slot = (s: string) => {
    const item = worn.get(s)
    const label = item ? `${slotLabel(s)}: ${item.name}` : slotLabel(s)
    return (
      <Link key={s} to={to} className={`doll__slot${item ? ' doll__slot--filled' : ''}`} title={label} aria-label={label}>
        <ItemIcon src={item ? itemIconUrl(item) : null} slot={slotBase(s)} size="sm" />
      </Link>
    )
  }

  return (
    <div className="doll doll--mini">
      <div className="doll__row doll__row--top">{DOLL.top.map(slot)}</div>
      <div className="doll__col doll__col--left">{DOLL.left.map(slot)}</div>
      <figure className="doll__portrait">
        {portrait
          ? <img src={portrait} alt={t('armory.portraitOf', { name: char.name })} />
          : <div className="doll__noportrait"><ClassIcon code={char.class} size={72} /></div>}
      </figure>
      <div className="doll__col doll__col--right">{DOLL.right.map(slot)}</div>
      <div className="doll__row doll__row--bottom">{DOLL.bottom.map(slot)}</div>
    </div>
  )
}
