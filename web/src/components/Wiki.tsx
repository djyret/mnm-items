import { useEffect, useState } from 'react'
import { fitsSlot } from '../lib/armory'
import { useI18n } from '../lib/i18n'
import { WIKI_HOME, searchWiki, wikiIdFromUrl, type WikiHit } from '../lib/wiki'
import { ItemIcon } from './ItemTooltip'

/** Källhänvisningen wikins villkor kräver där deras data visas. */
export function WikiCredit() {
  const { t } = useI18n()
  return (
    <small className="wiki-credit">
      {t('wiki.credit')} <a href={WIKI_HOME} target="_blank" rel="noreferrer">Monsters and Memories Wiki</a>
    </small>
  )
}

/**
 * Sökruta mot wikin med förslag medan man skriver (från två bokstäver, kort fördröjning så att
 * wikins gräns på 120 anrop/minut inte nås). Med slot visas bara items som passar där.
 */
export function WikiSearch({ onPick, initial = '', busy = false, slot }: {
  onPick: (hit: WikiHit) => void
  initial?: string
  busy?: boolean
  /** Slotplats (t.ex. FINGER_1): filtrera förslagen */
  slot?: string
}) {
  const { t } = useI18n()
  const [q, setQ] = useState(initial)
  const [hits, setHits] = useState<WikiHit[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setHits(null)
      return
    }
    let stale = false
    const timer = setTimeout(async () => {
      setSearching(true)
      setError(null)
      try {
        const found = await searchWiki(term)
        if (!stale) setHits(found)
      } catch (err) {
        if (!stale) setError((err as Error).message)
      }
      if (!stale) setSearching(false)
    }, 350)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [q])

  const shown = hits?.filter((h) => !slot || fitsSlot({ slots: h.slot }, slot)) ?? null

  return (
    <div className="wiki-search">
      <input
        className="wiki-search__input"
        value={q}
        onChange={(e) => {
          // En inklistrad wikilänk hämtar itemet direkt i stället för att söka
          const id = wikiIdFromUrl(e.target.value)
          if (id) {
            setQ('')
            onPick({ id, name: id, url: e.target.value.trim(), icon: null, slot: [] })
          } else {
            setQ(e.target.value)
          }
        }}
        placeholder={t('wiki.searchPlaceholder')}
        aria-label={t('wiki.searchPlaceholder')}
      />
      {searching && <small>{t('wiki.searching')}</small>}
      {error && <div className="alert">{error}</div>}
      {shown && shown.length === 0 && !searching && <small>{slot && hits!.length > 0 ? t('wiki.noneForSlot') : t('wiki.noHits')}</small>}
      {shown && shown.length > 0 && (
        <ul className="armory__list wiki-search__hits">
          {shown.map((h) => (
            <li key={h.id}>
              <ItemIcon src={h.icon} slot={h.slot[0]} size="sm" />
              <a href={h.url} target="_blank" rel="noreferrer">{h.name}</a>
              {h.slot.length > 0 && <small>{h.slot.join(' ')}</small>}
              <button type="button" className="btn btn--small" disabled={busy} onClick={() => onPick(h)}>{t('wiki.use')}</button>
            </li>
          ))}
        </ul>
      )}
      <WikiCredit />
    </div>
  )
}
