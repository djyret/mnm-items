import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDay, kronikaUrl, missingTables, sortEntries, weekday } from '../lib/kronikan'
import { supabase } from '../lib/supabase'
import type { Chapter, Entry } from '../lib/types'

type Thumb = Pick<Entry, 'id' | 'chapter_id' | 'kind' | 'image_path' | 'position'>

const today = () => new Date().toLocaleDateString('sv-SE')

export function MissingSetup() {
  return (
    <div className="panel">
      <h2 className="panel-title">Krönikan är inte uppsatt än</h2>
      <p>Databastabellerna saknas. Kör migrationen en gång:</p>
      <pre className="code">npx supabase db push --linked</pre>
    </div>
  )
}

/** Tidslinjen: ett kapitel per spelkväll, nyaste överst. */
export function Kronikan() {
  const navigate = useNavigate()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [thumbs, setThumbs] = useState<Thumb[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ title: '', played_on: today(), zone: '', subzone: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('chronicle_chapters').select('*').order('played_on', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('chronicle_entries').select('id, chapter_id, kind, image_path, position'),
    ]).then(([c, e]) => {
      const err = c.error ?? e.error
      if (err) setError(err.message)
      else {
        setChapters(c.data as Chapter[])
        setThumbs(sortEntries(e.data as Entry[]))
      }
      setLoading(false)
    })
  }, [])

  // Senaste kapitlets zon är bästa gissningen för nästa kväll
  useEffect(() => {
    const last = chapters[0]
    if (last) setDraft((d) => ({ ...d, zone: d.zone || last.zone || '', subzone: d.subzone || last.subzone || '' }))
  }, [chapters])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.title.trim()) return
    setBusy(true)
    const { data, error } = await supabase
      .from('chronicle_chapters')
      .insert({
        title: draft.title.trim(),
        played_on: draft.played_on || today(),
        zone: draft.zone.trim() || null,
        subzone: draft.subzone.trim() || null,
      })
      .select('id')
      .single()
    setBusy(false)
    if (error) setError(error.message)
    else navigate(`/kronikan/${data.id}`)
  }

  if (missingTables(error ?? undefined)) {
    return <div className="page"><h1 className="page-title">Krönikan</h1><MissingSetup /></div>
  }

  return (
    <div className="page">
      <div className="results__head">
        <h1 className="page-title">Krönikan</h1>
        <div className="actions kr-head-actions">
          {!adding && <button className="btn btn--primary" onClick={() => setAdding(true)}>+ Nytt kapitel</button>}
          <Link className="btn btn--ghost" to="/kronikan/stil">Stilbibel</Link>
        </div>
      </div>
      <p className="help-intro">Gängets äventyr, en spelkväll i taget. Släng in skärmdumpar och seriebilder, skriv vad som hände.</p>
      {error && <div className="alert">{error}</div>}

      {adding && (
        <form className="panel form" onSubmit={create}>
          <h2 className="panel-title field--wide">Nytt kapitel</h2>
          <label className="field field--wide">
            <span>Titel</span>
            <input autoFocus required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="t.ex. Flykten från Thralled Mine" />
          </label>
          <label className="field"><span>Spelkväll</span><input type="date" value={draft.played_on} onChange={(e) => setDraft({ ...draft, played_on: e.target.value })} /></label>
          <label className="field"><span>Zon</span><input value={draft.zone} onChange={(e) => setDraft({ ...draft, zone: e.target.value })} placeholder="t.ex. Rothold" /></label>
          <label className="field"><span>Delområde</span><input value={draft.subzone} onChange={(e) => setDraft({ ...draft, subzone: e.target.value })} placeholder="t.ex. Thralled Mine" /></label>
          <div className="actions field--wide">
            <button className="btn btn--primary" disabled={busy}>Skapa kapitel</button>
            <button type="button" className="btn btn--ghost" onClick={() => setAdding(false)}>Avbryt</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="panel empty">Laddar…</div>
      ) : chapters.length === 0 ? (
        <div className="panel empty">Inga kapitel än. Skapa det första och släng in bilderna från senaste kvällen.</div>
      ) : (
        <ol className="kr-timeline">
          {chapters.map((c) => {
            const own = thumbs.filter((t) => t.chapter_id === c.id)
            const pics = own.filter((t) => t.image_path)
            const cover = pics.find((t) => t.id === c.cover_id) ?? pics.find((t) => t.kind === 'serie') ?? pics[0]
            const rest = pics.filter((t) => t !== cover).slice(0, 6)
            return (
              <li key={c.id} className="kr-timeline__item">
                <div className="kr-timeline__date">
                  <span>{weekday(c.played_on)}</span>
                  <b>{formatDay(c.played_on)}</b>
                </div>
                <Link to={`/kronikan/${c.id}`} className="frame card kr-chapter">
                  <div className="kr-chapter__cover">
                    {cover ? <img src={kronikaUrl(cover.image_path)!} alt="" loading="lazy" /> : <span>Inga bilder än</span>}
                  </div>
                  <div className="kr-chapter__body">
                    <div className="frame__title">{c.title}</div>
                    {c.zone && <div className="kr-zone">{[c.zone, c.subzone].filter(Boolean).join(' · ')}</div>}
                    {c.summary && <p className="kr-chapter__summary">{c.summary}</p>}
                    {rest.length > 0 && (
                      <div className="kr-strip">
                        {rest.map((t) => <img key={t.id} src={kronikaUrl(t.image_path)!} alt="" loading="lazy" />)}
                      </div>
                    )}
                    <div className="card__foot">
                      <span className="card__from">{own.length} minnen</span>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
