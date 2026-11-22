import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AREAS, useAreas, type Area, type AreaLevel } from '../lib/access'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { VISIBILITY_HINTS, VISIBILITY_LABELS, formatDay } from '../lib/kronikan'
import { supabase } from '../lib/supabase'
import type { Chapter, Visibility } from '../lib/types'
import { syncIndex, useIndexInfo, type SyncProgress } from '../lib/wikiindex'
import { MembersPanel } from './Medlemmar'

const LEVELS: AreaLevel[] = ['visitor', 'guest', 'reader', 'editor', 'admin']

/** Adminpanelen: vem som ser vilka delar, synlighet per kapitel och medlemmar. */
export function Admin() {
  const { isAdmin, loading } = useAuth()
  const { t } = useI18n()
  if (loading) return null
  if (!isAdmin) {
    return (
      <div className="page">
        <h2 className="page-title">{t('admin.title')}</h2>
        <div className="panel empty">{t('admin.onlyAdmin')}</div>
      </div>
    )
  }
  return (
    <div className="page admin">
      <h2 className="page-title">{t('admin.title')}</h2>
      <AreaPanel />
      <ChapterPanel />
      <WikiIndexPanel />
      <MembersPanel />
    </div>
  )
}

function AreaPanel() {
  const { minRole, reload } = useAreas()
  const { t } = useI18n()
  const [busy, setBusy] = useState<Area | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function change(area: Area, level: AreaLevel) {
    setError(null)
    setBusy(area)
    const { data, error } = await supabase.from('area_access').update({ min_role: level }).eq('area', area).select('area')
    if (error) setError(error.message)
    else if (!data?.length) setError(t('admin.notSaved'))
    await reload()
    setBusy(null)
  }

  // Tabell: ett område per rad, rollerna i rangordning som kolumner. Man klickar på den lägsta roll
  // som ska se området; den och alla till höger markeras. Varje rad är en radiogrupp.
  return (
    <div className="panel">
      <h3 className="panel-title">{t('admin.areas.title')}</h3>
      <p className="members__intro">{t('admin.areas.intro')}</p>
      {error && <div className="alert">{error}</div>}
      <div className="access-grid">
        <div className="access-grid__row access-grid__row--head" aria-hidden="true">
          <span>{t('admin.areas.area')}</span>
          <div className="access-grid__levels">
            {LEVELS.map((l) => (
              <span key={l} className="access-grid__role" title={t(`admin.help.account.${l}`)}>{t(`role.${l}`)}</span>
            ))}
          </div>
        </div>
        {AREAS.map((area) => {
          const min = LEVELS.indexOf(minRole[area])
          return (
            <div key={area} className="access-grid__row">
              <div className="members__who">
                <strong>{t(`admin.area.${area}`)}</strong>
                <small>{t(`admin.area.${area}.covers`)}</small>
              </div>
              <div className="access-grid__levels" role="radiogroup" aria-label={t('admin.areas.selectLabel', { area: t(`admin.area.${area}`) })}>
                {LEVELS.map((l, i) => {
                  const sees = i >= min
                  return (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={i === min}
                      aria-label={t(`role.${l}`)}
                      title={t(`admin.areas.pick.${l}`)}
                      className={`access-grid__cell${sees ? ' is-on' : ''}${i === min ? ' is-min' : ''}`}
                      disabled={busy === area}
                      onClick={() => i !== min && change(area, l)}
                    >
                      <span className="access-grid__mark" aria-hidden="true">{sees ? '✓' : '–'}</span>
                      <span className="access-grid__name" aria-hidden="true">{t(`role.${l}`)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <p className="note">{t('admin.areas.legend')}</p>
    </div>
  )
}

/** Wikiindexet som setbyggaren i Armory väljer ur: fylls och uppdateras härifrån. */
function WikiIndexPanel() {
  const { t, locale } = useI18n()
  const { info, reload } = useIndexInfo()
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const running = progress !== null && progress.phase !== 'done'

  async function run() {
    setError(null)
    abort.current = new AbortController()
    try {
      setProgress(await syncIndex(setProgress, abort.current.signal))
    } catch (e) {
      setError((e as Error).message)
      setProgress(null)
    }
    abort.current = null
    await reload()
  }

  return (
    <div className="panel">
      <h3 className="panel-title">{t('admin.wiki.title')}</h3>
      <p className="members__intro">{t('admin.wiki.intro')}</p>
      {info && (
        <p className="note">
          {t('admin.wiki.status', { gear: info.gear, total: info.total })}
          {info.lastSync && ` · ${t('admin.wiki.last', { when: new Date(info.lastSync).toLocaleString(locale) })}`}
        </p>
      )}
      {error && <div className="alert" role="alert">{error}</div>}
      {progress && (
        <p className="note" role="status">
          {progress.phase === 'list' && t('admin.wiki.listing', { n: progress.done })}
          {progress.phase === 'fetch' && t('admin.wiki.fetching', { done: progress.done, todo: progress.todo })}
          {progress.phase === 'done' && t('admin.wiki.done', { n: progress.done })}
          {progress.failed > 0 && ` ${t('admin.wiki.failed', { n: progress.failed })}`}
        </p>
      )}
      {running && progress.phase === 'fetch' && <progress max={progress.todo || 1} value={progress.done} />}
      <div className="actions">
        {running
          ? <button type="button" className="btn btn--ghost" onClick={() => abort.current?.abort()}>{t('admin.wiki.stop')}</button>
          : <button type="button" className="btn btn--primary" onClick={run}>{t('admin.wiki.run')}</button>}
      </div>
      {running && <small className="note">{t('admin.wiki.keepOpen')}</small>}
    </div>
  )
}

type ChapterRow = Pick<Chapter, 'id' | 'title' | 'played_on' | 'visibility'>

function ChapterPanel() {
  const { t } = useI18n()
  const [rows, setRows] = useState<ChapterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('chronicle_chapters')
      .select('id, title, played_on, visibility')
      .order('played_on', { ascending: false })
    if (error) setError(error.message)
    else setRows(data as ChapterRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function change(id: string, visibility: Visibility) {
    setError(null)
    setBusy(id)
    const { error } = await supabase.from('chronicle_chapters').update({ visibility }).eq('id', id)
    if (error) setError(error.message)
    await load()
    setBusy(null)
  }

  const counts = rows.reduce<Record<Visibility, number>>((n, r) => ({ ...n, [r.visibility]: n[r.visibility] + 1 }), { public: 0, group: 0, draft: 0 })

  return (
    <div className="panel">
      <h3 className="panel-title">{t('admin.chapters.title')}</h3>
      <p className="members__intro">
        {(Object.keys(VISIBILITY_LABELS) as Visibility[]).map((v) => `${counts[v]} ${VISIBILITY_LABELS[v].toLowerCase()}`).join(' · ')}.
        {' '}{VISIBILITY_HINTS.public} {VISIBILITY_HINTS.group} {VISIBILITY_HINTS.draft}
      </p>
      {error && <div className="alert">{error}</div>}
      {loading ? (
        <div className="empty">{t('common.loading')}</div>
      ) : error ? null : rows.length === 0 ? (
        <div className="empty">{t('admin.chapters.empty')}</div>
      ) : (
        <ul className="admin-list">
          {rows.map((c) => (
            <li key={c.id} className="admin-list__row">
              <div className="members__who">
                <Link to={`/kronikan/${c.id}`}><strong>{c.title}</strong></Link>
                <small>{formatDay(c.played_on)}</small>
              </div>
              <select
                aria-label={t('admin.chapters.selectLabel', { title: c.title })}
                value={c.visibility}
                disabled={busy === c.id}
                onChange={(e) => change(c.id, e.target.value as Visibility)}
              >
                {(Object.keys(VISIBILITY_LABELS) as Visibility[]).map((v) => <option key={v} value={v}>{VISIBILITY_LABELS[v]}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
