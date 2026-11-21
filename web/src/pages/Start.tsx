// Startsidan: ens main som karaktärsblad till vänster, gängets senaste kvällar spikade på väggen
// till höger. Besökare (och den som inte ser förrådet) får bara väggen.
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ClassIcon } from '../components/ClassIcon'
import { GearSummary } from '../components/GearStats'
import { MiniDoll } from '../components/MiniDoll'
import { useAreas } from '../lib/access'
import { equippedBy } from '../lib/armory'
import { useAuth } from '../lib/auth'
import { CLASSES } from '../lib/constants'
import { useI18n } from '../lib/i18n'
import { formatDay, kronikaUrl, sortEntries, weekday } from '../lib/kronikan'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import type { Chapter, Character, Entry } from '../lib/types'

export function Start() {
  const { canView, loading } = useAreas()
  const { access, loading: authLoading } = useAuth()
  if (loading || authLoading) return null
  const sheet = canView('forradet') && access !== 'visitor'
  const wall = canView('kronikan')
  if (!sheet && !wall) return <Navigate to="/hjalp" replace />
  return (
    <div className={`page start${sheet && wall ? '' : ' start--single'}`}>
      {sheet && <MainSheet />}
      {wall && <Wall />}
    </div>
  )
}

// ---------- Karaktärsbladet ----------

function MainSheet() {
  const { membership } = useAuth()
  const { characters, items, loading } = useStore()
  const { t } = useI18n()
  const [picking, setPicking] = useState(false)
  const main = characters.find((c) => c.id === membership?.main_character_id)
  const worn = useMemo(() => (main ? equippedBy(items, main.id) : new Map()), [items, main])

  if (loading) return <aside className="start-sheet"><div className="panel empty">{t('common.loading')}</div></aside>
  if (!main || picking) return <aside className="start-sheet"><PickMain current={main ?? null} onDone={() => setPicking(false)} /></aside>

  const info = [main.level && `Level ${main.level}`, main.race, main.class && (CLASSES[main.class] || main.class)].filter(Boolean).join(' · ')
  return (
    <aside className="start-sheet" aria-labelledby="start-main-name">
      <div className="panel start-sheet__card">
        <header className="start-sheet__head">
          <ClassIcon code={main.class} size={44} />
          <div>
            <h2 id="start-main-name" className="start-sheet__name">{main.name}</h2>
            {info && <div className="char__info">{info}</div>}
          </div>
        </header>
        <MiniDoll char={main} worn={worn} />
        <GearSummary worn={[...worn.values()]} />
        <div className="start-sheet__actions">
          <Link className="btn btn--primary" to={`/karaktar/${main.id}`}>{t('start.openArmory')}</Link>
          <button type="button" className="btn btn--small btn--ghost" onClick={() => setPicking(true)}>{t('start.changeMain')}</button>
        </div>
      </div>
    </aside>
  )
}

function PickMain({ current, onDone }: { current: Character | null; onDone: () => void }) {
  const { reloadMembership } = useAuth()
  const { characters } = useStore()
  const { t } = useI18n()
  const [choice, setChoice] = useState(current?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Mains först, sedan resten i bokstavsordning
  const sorted = [...characters].sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.name.localeCompare(b.name))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!choice) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('set_my_main', { char_id: choice })
    // Databasens text är på engelska och teknisk; visa vad som hände och vad man kan göra
    if (error) setError(t('start.pickError'))
    else {
      await reloadMembership()
      onDone()
    }
    setBusy(false)
  }

  return (
    <form className="panel start-pick" onSubmit={save}>
      <h2 className="panel-title">{t('start.pickTitle')}</h2>
      {characters.length === 0 ? (
        <p className="armory__empty">{t('start.noChars')} <Link to="/karaktarer">{t('nav.characters')}</Link></p>
      ) : (
        <>
          <p className="start-pick__intro">{t('start.pickIntro')}</p>
          {error && <div className="alert">{error}</div>}
          <label className="field">
            <span>{t('start.pickLabel')}</span>
            <select value={choice} onChange={(e) => setChoice(e.target.value)} required>
              <option value="" disabled>{t('start.pickNone')}</option>
              {sorted.map((c) => <option key={c.id} value={c.id}>{c.name}{c.class ? ` (${CLASSES[c.class] || c.class})` : ''}</option>)}
            </select>
          </label>
          <div className="actions">
            <button className="btn btn--primary" disabled={busy || !choice}>{t('start.pickSave')}</button>
            {current && <button type="button" className="btn btn--ghost" onClick={onDone}>{t('common.cancel')}</button>}
          </div>
        </>
      )}
    </form>
  )
}

// ---------- Väggen ----------

type Pic = Pick<Entry, 'id' | 'chapter_id' | 'kind' | 'image_path' | 'position'>

/** Lutning och spegling per lapp, så att grannar aldrig hänger likadant. */
const HANG = [
  { tilt: '-1.1deg', flip: 1 },
  { tilt: '1.8deg', flip: -1 },
  { tilt: '-2.2deg', flip: 1 },
]

function Wall() {
  const { t } = useI18n()
  const [chapters, setChapters] = useState<Chapter[] | null>(null)
  const [pics, setPics] = useState<Pic[]>([])

  useEffect(() => {
    let stale = false
    supabase.from('chronicle_chapters').select('*')
      .order('played_on', { ascending: false }).order('created_at', { ascending: false }).limit(3)
      .then(async ({ data }) => {
        const list = (data as Chapter[]) ?? []
        const { data: e } = list.length
          ? await supabase.from('chronicle_entries').select('id, chapter_id, kind, image_path, position').in('chapter_id', list.map((c) => c.id))
          : { data: [] }
        if (stale) return
        setPics(sortEntries((e as Entry[]) ?? []).filter((p) => p.image_path))
        setChapters(list)
      })
    return () => { stale = true }
  }, [])

  const coverOf = (c: Chapter) => {
    const own = pics.filter((p) => p.chapter_id === c.id)
    return own.find((p) => p.id === c.cover_id) ?? own.find((p) => p.kind === 'serie') ?? own[0]
  }

  return (
    <section className="start-wall" aria-labelledby="start-wall-title">
      <h2 id="start-wall-title" className="page-title start-wall__title">{t('start.wallTitle')}</h2>
      {chapters === null ? (
        <div className="panel empty">{t('common.loading')}</div>
      ) : chapters.length === 0 ? (
        <div className="panel empty">{t('start.wallEmpty')}</div>
      ) : (
        <div className="start-wall__board">
          {chapters.map((c, i) => {
            const cover = coverOf(c)
            const style = { '--tilt': HANG[i].tilt, '--flip': HANG[i].flip } as CSSProperties
            return (
              <Link key={c.id} to={`/kronikan/${c.id}`} className={`start-note${i === 0 ? ' start-note--lead' : ''}`} style={style}>
                <span className="start-note__img">
                  {cover ? <img src={kronikaUrl(cover.image_path)!} alt="" loading={i === 0 ? 'eager' : 'lazy'} /> : <span>{t('kronikan.list.noPictures')}</span>}
                </span>
                <span className="start-note__title">{c.title}</span>
                <span className="start-note__meta">
                  {weekday(c.played_on)} {formatDay(c.played_on)}{c.zone && ` · ${[c.zone, c.subzone].filter(Boolean).join(', ')}`}
                </span>
                {i === 0 && c.summary && <span className="start-note__summary">{c.summary}</span>}
                {i === 0 && <span className="start-note__read">{t('start.readEvening')}</span>}
              </Link>
            )
          })}
        </div>
      )}
      <div className="start-wall__foot"><Link className="btn" to="/kronikan">{t('start.allEvenings')}</Link></div>
    </section>
  )
}

