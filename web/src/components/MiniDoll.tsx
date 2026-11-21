// Kompakt karaktärsfönster för startsidan: samma placering som i Armory, utan etiketter.
// Dockan är en bild av utrustningen, inte 22 länkar: musen kan klicka på den för att öppna
// Armory, men tangentbord och skärmläsare får en vanlig lista och knappen "Öppna Armory" bredvid.
import { useNavigate } from 'react-router-dom'
import { DOLL, EQUIP_SLOTS, slotBase, slotLabel } from '../lib/armory'
import { useI18n } from '../lib/i18n'
import { itemIconUrl } from '../lib/items'
import { imageUrl } from '../lib/supabase'
import type { Character, Item } from '../lib/types'
import { ClassIcon } from './ClassIcon'
import { useItemHover } from './ItemHover'
import { ItemIcon } from './ItemTooltip'

export function MiniDoll({ char, worn }: { char: Character; worn: Map<string, Item> }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const portrait = imageUrl(char.portrait_path)
  const hover = useItemHover()

  const slot = (s: string) => {
    const item = worn.get(s)
    return (
      <span key={s} className={`doll__slot${item ? ' doll__slot--filled' : ''}`} title={item ? undefined : slotLabel(s)} {...hover.bind(item)}>
        <ItemIcon src={item ? itemIconUrl(item) : null} slot={slotBase(s)} size="sm" />
      </span>
    )
  }

  // På pekskärm finns ingen tooltip, så ett tryck ska inte kasta iväg en; där gäller knappen
  const openWithMouse = () => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    hover.hide()
    navigate(`/karaktar/${char.id}`)
  }

  const equipped = EQUIP_SLOTS.filter((s) => worn.has(s))
  return (
    <>
      <div className="doll doll--mini" aria-hidden="true" onClick={openWithMouse}>
        <div className="doll__row doll__row--top">{DOLL.top.map(slot)}</div>
        <div className="doll__col doll__col--left">{DOLL.left.map(slot)}</div>
        <figure className="doll__portrait">
          {portrait
            ? <img src={portrait} alt="" />
            : <div className="doll__noportrait"><ClassIcon code={char.class} size={72} /></div>}
        </figure>
        <div className="doll__col doll__col--right">{DOLL.right.map(slot)}</div>
        <div className="doll__row doll__row--bottom">{DOLL.bottom.map(slot)}</div>
      </div>
      <ul className="sr-only" aria-label={t('start.equippedLabel', { name: char.name })}>
        {equipped.length === 0
          ? <li>{t('armory.nothingEquipped')}</li>
          : equipped.map((s) => <li key={s}>{slotLabel(s)}: {worn.get(s)!.name}</li>)}
      </ul>
      {hover.tip}
    </>
  )
}
