import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { WIKI_HOME, searchWiki, type WikiHit } from '../lib/wiki'
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

/** Sökruta mot wikin; onPick får det valda itemet. */
export function WikiSearch({ onPick, initial = '', busy = false }: {
  onPick: (hit: WikiHit) => void
  initial?: string
  busy?: boolean
}) {
  const { t } = useI18n()
  const [q, setQ] = useState(initial)
  const [hits, setHits] = useState<WikiHit[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    setSearching(true)
    setError(null)
    try {
      setHits(await searchWiki(q))
    } catch (err) {
      setError((err as Error).message)
    }
    setSearching(false)
  }

  return (
    <div className="wiki-search">
      <form className="wiki-search__form" onSubmit={search}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('wiki.searchPlaceholder')} aria-label={t('wiki.searchPlaceholder')} />
        <button className="btn" disabled={searching || busy || !q.trim()}>{searching ? t('wiki.searching') : t('wiki.search')}</button>
      </form>
      {error && <div className="alert">{error}</div>}
      {hits && hits.length === 0 && <small>{t('wiki.noHits')}</small>}
      {hits && hits.length > 0 && (
        <ul className="armory__list wiki-search__hits">
          {hits.map((h) => (
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
