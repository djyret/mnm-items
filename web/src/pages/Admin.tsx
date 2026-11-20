import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AREAS, MIN_ROLE_LABEL, useAreas, type Area } from '../lib/access'
import { useAuth, type Access } from '../lib/auth'
import { VISIBILITY_HINTS, VISIBILITY_LABELS, formatDay } from '../lib/kronikan'
import { supabase } from '../lib/supabase'
import type { Chapter, Visibility } from '../lib/types'
import { MembersPanel } from './Medlemmar'

const LEVELS: Access[] = ['visitor', 'reader', 'editor', 'admin']

/** Adminpanelen: vem som ser vilka delar, synlighet per kapitel och medlemmar. */
export function Admin() {
  const { isAdmin, loading } = useAuth()
  if (loading) return null
  if (!isAdmin) {
    return (
      <div className="page">
        <h2 className="page-title">Admin</h2>
        <div className="panel empty">Bara admin kommer åt adminpanelen.</div>
      </div>
    )
  }
  return (
    <div className="page admin">
      <h2 className="page-title">Admin</h2>
      <AreaPanel />
      <ChapterPanel />
      <MembersPanel />
    </div>
  )
}

function AreaPanel() {
  const { minRole, reload } = useAreas()
  const [busy, setBusy] = useState<Area | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function change(area: Area, level: Access) {
    setError(null)
    setBusy(area)
    const { data, error } = await supabase.from('area_access').update({ min_role: level }).eq('area', area).select('area')
    if (error) setError(error.message)
    else if (!data?.length) setError('Ändringen sparades inte. Är du fortfarande inloggad som admin?')
    await reload()
    setBusy(null)
  }

  return (
    <div className="panel">
      <h3 className="panel-title">Vem ser vad</h3>
      <p className="members__intro">
        Lägsta nivå som får se varje del. Det spärras i databasen, inte bara i menyn. Admin ser alltid allt.
      </p>
      {error && <div className="alert">{error}</div>}
      <ul className="admin-list">
        {AREAS.map(({ area, label, covers }) => (
          <li key={area} className="admin-list__row">
            <div className="members__who">
              <strong>{label}</strong>
              <small>{covers}</small>
            </div>
            <select
              aria-label={`Vem ser ${label}`}
              value={minRole[area]}
              disabled={busy === area}
              onChange={(e) => change(area, e.target.value as Access)}
            >
              {LEVELS.map((l) => <option key={l} value={l}>{MIN_ROLE_LABEL[l]}</option>)}
            </select>
          </li>
        ))}
      </ul>
    </div>
  )
}

type ChapterRow = Pick<Chapter, 'id' | 'title' | 'played_on' | 'visibility'>

function ChapterPanel() {
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
      <h3 className="panel-title">Kapitel</h3>
      <p className="members__intro">
        {(Object.keys(VISIBILITY_LABELS) as Visibility[]).map((v) => `${counts[v]} ${VISIBILITY_LABELS[v].toLowerCase()}`).join(' · ')}.
        {' '}{VISIBILITY_HINTS.public} {VISIBILITY_HINTS.group} {VISIBILITY_HINTS.draft}
      </p>
      {error && <div className="alert">{error}</div>}
      {loading ? (
        <div className="empty">Laddar …</div>
      ) : error ? null : rows.length === 0 ? (
        <div className="empty">Inga kapitel än.</div>
      ) : (
        <ul className="admin-list">
          {rows.map((c) => (
            <li key={c.id} className="admin-list__row">
              <div className="members__who">
                <Link to={`/kronikan/${c.id}`}><strong>{c.title}</strong></Link>
                <small>{formatDay(c.played_on)}</small>
              </div>
              <select
                aria-label={`Vem får läsa ${c.title}`}
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
