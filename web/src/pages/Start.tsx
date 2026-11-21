// Startsidan: ens main som karaktärsblad till vänster, gängets senaste kvällar spikade på väggen
// till höger. Besökare (och den som inte ser förrådet) får bara väggen.
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ClassIcon } from '../components/ClassIcon'
import { GearSummary } from '../components/GearStats'
import { useItemHover } from '../components/ItemHover'
import { MiniDoll } from '../components/MiniDoll'
import { useAreas } from '../lib/access'
import { guestInfo, useGuestCharacters } from '../lib/guests'
import { equippedBy } from '../lib/armory'
import { useAuth } from '../lib/auth'
import { CLASSES } from '../lib/constants'
import { useI18n } from '../lib/i18n'
import { formatDay, kronikaUrl, sortEntries, weekday } from '../lib/kronikan'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import type { Chapter, Character, Entry, Item } from '../lib/types'

export function Start() {
  const { canView, loading } = useAreas()
  const { access, loading: authLoading } = useAuth()
  const { t } = useI18n()
  if (loading || authLoading) return <div className="page"><div className="panel empty">{t('common.loading')}</div></div>
  // Karaktärsbladet är gängets (main väljs bland förrådets karaktärer); gästen får sina gästkaraktärer
  const sheet = canView('forradet') && (access === 'reader' || access === 'editor' || access === 'admin')
  const guest = access === 'guest'
  const wall = canView('kronikan')
  if (!sheet && !guest && !wall) return <Navigate to="/hjalp" replace />
  return (
    <div className={`page start${(sheet || guest) && wall ? '' : ' start--single'}`}>
      {sheet && <MainSheet />}
      {guest && <GuestSheet />}
      {wall && <Wall intro={access === 'visitor'} />}
    </div>
  )
}

// ---------- Gästens blad: egna gästkaraktärer ----------

function GuestSheet() {
  const { session } = useAuth()
  const { list } = useGuestCharacters()
  const { t } = useI18n()
  const mine = (list ?? []).filter((c) => c.owner_id === session?.user.id)
  return (
    <section className="start-sheet" aria-labelledby="start-guest-title">
      <div className="panel panel--tung start-sheet__card">
        <h2 id="start-guest-title" className="start-sheet__name">{t('gaster.startTitle')}</h2>
        <p className="start-pick__intro">{t('gaster.startText')}</p>
        {list === null ? (
          <p className="armory__empty">{t('common.loading')}</p>
        ) : mine.length === 0 ? (
          <p className="armory__empty">{t('gaster.startEmpty')}</p>
        ) : (
          <ul className="armory__list armory__list--wide">
            {mine.map((c) => (
              <li key={c.id}>
                <ClassIcon code={c.class} size={32} />
                <Link to={`/gast/${c.id}`}>{c.name}</Link>
                <small>{guestInfo(c)}</small>
              </li>
            ))}
          </ul>
        )}
        <div className="start-sheet__actions">
          <Link className="btn btn--primary" to="/gaster">{t('gaster.startOpen')}</Link>
        </div>
      </div>
    </section>
  )
}

// ---------- Karaktärsbladet ----------

function MainSheet() {
  const { membership } = useAuth()
  const { characters, items, loading } = useStore()
  const { t } = useI18n()
  const [picking, setPicking] = useState(false)
  const main = characters.find((c) => c.id === membership?.main_character_id)
  const worn = useMemo(() => (main ? equippedBy(items, main.id) : new Map<string, Item>()), [items, main])

  if (loading) return <section className="start-sheet"><div className="panel empty">{t('common.loading')}</div></section>
  if (!main || picking) return <section className="start-sheet"><PickMain current={main ?? null} onDone={() => setPicking(false)} /></section>

  const info = [main.level && t('start.level', { n: main.level }), main.race, main.class && (CLASSES[main.class] || main.class)].filter(Boolean).join(' · ')
  return (
    <section className="start-sheet" aria-labelledby="start-main-name">
      <div className="panel panel--tung start-sheet__card">
        <header className="start-sheet__head">
          <ClassIcon code={main.class} size={44} />
          <div>
            <h2 id="start-main-name" className="start-sheet__name">{main.name}</h2>
            {info && <div className="char__info">{info}</div>}
          </div>
        </header>
        <MiniDoll char={main} worn={worn} />
        <GearSummary worn={[...worn.values()]} />
        <SinceLast main={main} />
        <div className="start-sheet__actions">
          <Link className="btn btn--primary" to={`/karaktar/${main.id}`}>{t('start.openArmory')}</Link>
          <button type="button" className="btn btn--small btn--ghost" onClick={() => setPicking(true)}>{t('start.changeMain')}</button>
        </div>
      </div>
    </section>
  )
}

/**
 * Senaste besöket före den här sessionen. Tiden flyttas fram en gång per webbläsarsession
 * (sessionStorage håller kvar startpunkten), så att Hem → Armory → Hem inte nollställer
 * "Sedan sist". Idempotent: React kan anropa den två gånger i utvecklingsläge.
 */
function visitBaseline(uid: string): string | null {
  const lastKey = `mnm:senast-hemma:${uid}`
  const sessionKey = `mnm:hemma-sedan:${uid}`
  try {
    const kept = sessionStorage.getItem(sessionKey)
    if (kept !== null) return kept || null
    const previous = localStorage.getItem(lastKey)
    sessionStorage.setItem(sessionKey, previous ?? '')
    localStorage.setItem(lastKey, new Date().toISOString())
    return previous
  } catch {
    return null // privat läge: då visas inget nytt
  }
}

/**
 * "Sedan sist": vad som hänt i förrådet sedan förra besöket, så att bladet inte ser likadant ut
 * varje gång. Items sparar inte vem som lade in dem, så även egna nya items räknas med.
 */
function SinceLast({ main }: { main: Character }) {
  const { session } = useAuth()
  const { items } = useStore()
  const { t } = useI18n()
  const [since] = useState(() => visitBaseline(session?.user.id ?? 'anon'))
  const hover = useItemHover()
  const sinceMs = since ? Date.parse(since) : NaN

  const borrowing = items.filter((i) => i.status === 'utlanad' && i.lent_to_id === main.id)
  const lending = items.filter((i) => i.status === 'utlanad' && i.holder_id === main.id && i.lent_to_id)
  const fresh = Number.isNaN(sinceMs) ? [] : items.filter((i) => Date.parse(i.created_at) > sinceMs)
  if (Number.isNaN(sinceMs) && borrowing.length === 0 && lending.length === 0) return null

  // Upp till tre itemlänkar, resten som "+N"
  const links = (list: Item[]) => (
    <>
      {list.slice(0, 3).map((i, n) => <span key={i.id}>{n > 0 && ', '}<Link to={`/item/${i.id}`} {...hover.bind(i)}>{i.name}</Link></span>)}
      {list.length > 3 && ` +${list.length - 3}`}
    </>
  )
  return (
    <div className="start-since">
      {hover.tip}
      <h3 className="start-since__head">{t('start.sinceTitle')}</h3>
      <ul>
        {!Number.isNaN(sinceMs) && (
          <li>
            {fresh.length === 0
              ? t('start.nothingNew')
              : <Link to={`/forrad?sedan=${encodeURIComponent(since!)}`}>{t(fresh.length === 1 ? 'start.newItemsOne' : 'start.newItems', { n: fresh.length })}</Link>}
          </li>
        )}
        {borrowing.length > 0 && <li>{t('start.borrowing')} {links(borrowing)}</li>}
        {lending.length > 0 && <li>{t('start.lending')} {links(lending)}</li>}
      </ul>
    </div>
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
          {error && <div className="alert" role="alert">{error}</div>}
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

type WallState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; chapters: Chapter[]; pics: Pic[] }

function Wall({ intro }: { intro: boolean }) {
  const { t } = useI18n()
  const [state, setState] = useState<WallState>({ status: 'loading' })

  const load = useCallback(async (): Promise<WallState> => {
    try {
      const c = await supabase.from('chronicle_chapters').select('*')
        .order('played_on', { ascending: false }).order('created_at', { ascending: false }).limit(3)
      if (c.error) throw c.error
      const chapters = (c.data as Chapter[]) ?? []
      let pics: Pic[] = []
      if (chapters.length) {
        const e = await supabase.from('chronicle_entries').select('id, chapter_id, kind, image_path, position').in('chapter_id', chapters.map((x) => x.id))
        if (e.error) throw e.error
        pics = sortEntries((e.data as Entry[]) ?? []).filter((p) => p.image_path)
      }
      return { status: 'ready', chapters, pics } as const
    } catch {
      return { status: 'error' } as const
    }
  }, [])

  useEffect(() => {
    let stale = false
    load().then((s) => { if (!stale) setState(s) })
    return () => { stale = true }
  }, [load])

  const retry = () => {
    setState({ status: 'loading' })
    load().then(setState)
  }

  const coverOf = (c: Chapter, pics: Pic[]) => {
    const own = pics.filter((p) => p.chapter_id === c.id)
    return own.find((p) => p.id === c.cover_id) ?? own.find((p) => p.kind === 'serie') ?? own[0]
  }

  return (
    <section className="start-wall" aria-labelledby="start-wall-title">
      <h2 id="start-wall-title" className="page-title start-wall__title">{t('start.wallTitle')}</h2>
      {intro && <p className="start-wall__intro">{t('start.wallIntro')}</p>}
      {state.status === 'loading' ? (
        <div className="panel empty" aria-busy="true">{t('common.loading')}</div>
      ) : state.status === 'error' ? (
        <div className="alert start-wall__error" role="alert">
          <span>{t('start.wallError')}</span>
          <button type="button" className="btn btn--small" onClick={retry}>{t('start.retry')}</button>
        </div>
      ) : state.chapters.length === 0 ? (
        <div className="panel empty">{t('start.wallEmpty')}</div>
      ) : (
        <div className="start-wall__board">
          {state.chapters.map((c, i) => {
            const cover = coverOf(c, state.pics)
            const style = { '--tilt': HANG[i].tilt, '--flip': HANG[i].flip } as CSSProperties
            const meta = `${weekday(c.played_on)} ${formatDay(c.played_on)}${c.zone ? ` · ${[c.zone, c.subzone].filter(Boolean).join(', ')}` : ''}`
            return (
              <Link key={c.id} to={`/kronikan/${c.id}`} className={`start-note${i === 0 ? ' start-note--lead' : ''}`} style={style}
                aria-label={`${c.title}, ${meta}`}>
                {i === 0 && <img className="start-note__sigill" src={`${import.meta.env.BASE_URL}ui/sigill-band-rod.webp`} alt="" />}
                <span className="start-note__img">
                  {cover ? <img src={kronikaUrl(cover.image_path)!} alt="" loading={i === 0 ? 'eager' : 'lazy'} /> : <span>{t('kronikan.list.noPictures')}</span>}
                </span>
                <span className="start-note__text">
                  <span className="start-note__title">{c.title}</span>
                  <span className="start-note__meta">{meta}</span>
                  {i === 0 && c.summary && <span className="start-note__summary">{c.summary}</span>}
                  {i === 0 && <span className="start-note__read">{t('start.readEvening')}</span>}
                </span>
              </Link>
            )
          })}
        </div>
      )}
      <div className="start-wall__foot"><Link className="btn" to="/kronikan">{t('start.allEvenings')}</Link></div>
    </section>
  )
}
