import { STAT_GROUPS, STAT_HELP, slotIcon, statLabel, weaponRatio } from '../lib/constants'
import type { ItemDraft } from '../lib/types'
import { Icon } from './Icon'

const fmt = (v: number) => (v > 0 ? `+${v}` : `${v}`)

/** Ikonruta som inventory-slotten i spelet; utan ikon visas sloten som text. */
export function ItemIcon({ src, slot, size = 'md' }: { src?: string | null; slot?: string; size?: 'sm' | 'md' }) {
  return (
    <div className={`item-icon item-icon--${size}`}>
      {src
        ? <img src={src} alt="" loading="lazy" />
        : <img className="item-icon__slot" src={slotIcon(slot)} alt="" title={slot} loading="lazy" />}
    </div>
  )
}

/** Ritar itemet som spelets tooltip-fönster. */
export function ItemTooltip({ item, compact = false, iconUrl }: {
  item: ItemDraft
  compact?: boolean
  iconUrl?: string | null
}) {
  const known = new Set(STAT_GROUPS.flat())
  const groups = STAT_GROUPS.map((g) => g.filter((k) => item.stats[k] != null)).filter((g) => g.length)
  const others = Object.keys(item.stats).filter((k) => !known.has(k))
  if (others.length) groups.push(others)
  const ratio = weaponRatio(item.stats)

  return (
    <div className={`tooltip${compact ? ' tooltip--compact' : ''}`}>
      <div className="tooltip__title">
        <span className="tooltip__grip" aria-hidden />
        <span className="tooltip__name">{item.name || 'Namnlöst item'}</span>
        <span className="tooltip__x" aria-hidden><Icon name="stang" size={10} /></span>
      </div>
      <div className="tooltip__body">
        <ItemIcon src={iconUrl} slot={item.slots[0]} size={compact ? 'sm' : 'md'} />
        <div className="tooltip__lines">
          {item.flags.length > 0 && <div>{item.flags.join(' ')}</div>}
          {item.slots.length > 0 && <div>Slot: {item.slots.join(' ')}</div>}
          {item.ac != null && <div className="tooltip__ac" title={STAT_HELP.AC}>AC: {item.ac}</div>}
          {groups.map((g) => (
            <div key={g.join()}>
              {g.map((k) => (
                <span key={k} className="tooltip__stat" title={STAT_HELP[k]}>
                  {statLabel(k)}: {['DMG', 'DLY', 'RANGE'].includes(k) ? item.stats[k] : fmt(item.stats[k])}
                </span>
              ))}
              {g.includes('DLY') && ratio != null && (
                <span className="tooltip__stat tooltip__ratio" title="DMG / DLY – högre är bättre">Ratio: {ratio.toFixed(3)}</span>
              )}
            </div>
          ))}
          {item.effect && !compact && (
            <>
              <div>Effect:</div>
              <div className="tooltip__effect">{item.effect}</div>
            </>
          )}
          {item.effect && compact && <div className="tooltip__effect">Effect: {item.effect.split('(')[0].trim()}</div>}
          {item.description && !compact && <div className="tooltip__desc">{item.description}</div>}
          {!compact && item.extra_lines.map((l) => <div key={l}>{l}</div>)}
          {(item.weight != null || item.size) && !compact && (
            <div>
              {item.weight != null && <span className="tooltip__stat">Weight: {item.weight}</span>}
              {item.size && <span className="tooltip__stat">Size: {item.size}</span>}
            </div>
          )}
          {item.classes.length > 0 && <div>Class: {item.classes.join(' ')}</div>}
          {item.races.length > 0 && !compact && <div>Race: {item.races.join(' ')}</div>}
        </div>
      </div>
    </div>
  )
}
