import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChapterTabs } from '../components/ChapterTabs'
import { Icon } from '../components/Icon'
import {
  formatDay, kronikaUrl, loadCastAndStyle, missingTables, quoteVolume, shortId, sortEntries, storyParagraphs, tilt, weekday, foldSources,
} from '../lib/kronikan'
import { supabase } from '../lib/supabase'
import type { CastMember, Chapter, Entry, Quote } from '../lib/types'
import { MissingSetup } from './Kronikan'

/** Det som nålas upp på tavlan, i kvällens ordning. */
type Pin =
  | { type: 'affisch'; entry: Entry }
  | { type: 'polaroid'; entry: Entry }
  | { type: 'lapp'; entry: Entry }
  | { type: 'replik'; entry: Entry; quote: Quote; key: string }

function toPins(entries: Entry[]): Pin[] {
  const pins: Pin[] = []
  for (const e of entries) {
    if (e.kind === 'serie') {
      // Seriebilder utan bild väntar fortfarande i verkstaden; repliker finns redan i bilden
      if (e.image_path) pins.push({ type: 'affisch', entry: e })
      continue
    }
    if (e.image_path) pins.push({ type: 'polaroid', entry: e })
    else if (e.caption || e.url) pins.push({ type: 'lapp', entry: e })
    e.quotes.forEach((quote, i) => quote.text.trim() && pins.push({ type: 'replik', entry: e, quote, key: `${e.id}-${i}` }))
  }
  return pins
}

const isLong = (pin: Pin) =>
  pin.type === 'replik'
    ? pin.quote.text.length > (quoteVolume(pin.quote.text) === 'ropar' ? 28 : 60)
    : pin.type === 'lapp' && (pin.entry.caption?.length ?? 0) > 110

interface Box { x: number; y: number; w: number; h: number }

const GAP = 20
const COL = 200
const ROW = 133
/** Järnramens kanter runt seriebilderna (index.css .kr-poster) */
const FRAME_X = 22
const FRAME_Y = 30

/** Hur stor lappen är i rutor. ratio = bildens bredd/höjd när den har laddats. */
function sizeOf(pin: Pin, ratio: number | undefined, finale: boolean, cols: number, mobile: boolean): { w: number; h: number } {
  if (mobile) return { w: pin.type === 'affisch' ? 2 : 1, h: 1 }
  if (pin.type === 'affisch') {
    const r = ratio ?? 1.5
    const w = finale && r >= 1.2 ? cols : finale && r >= 0.85 ? Math.min(3, cols) : 2
    const px = w * COL + (w - 1) * GAP
    return { w, h: Math.max(2, Math.round((px / r + GAP) / (ROW + GAP))) }
  }
  if (pin.type === 'polaroid' || isLong(pin)) return { w: 1, h: 2 }
  return { w: 1, h: 1 }
}

/**
 * Placerar lapparna rad för rad i kvällens ordning – ingen lapp hoppar bakåt in i ett hål.
 * Hål som blir kvar stängs genom att den lilla lappen bredvid eller ovanför breddas eller förlängs.
 */
function place(sizes: { w: number; h: number }[], small: boolean[], cols: number): Box[] {
  const taken = new Set<string>()
  const free = (x: number, y: number) => !taken.has(`${x},${y}`)
  const fits = (x: number, y: number, w: number, h: number) => {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (!free(x + dx, y + dy)) return false
    return true
  }
  const mark = (b: Box) => { for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) taken.add(`${b.x + dx},${b.y + dy}`) }
  const boxes: Box[] = []
  let cy = 0
  let cx = 0
  for (const sz of sizes) {
    const w = Math.min(sz.w, cols)
    for (let y = cy; ; y++) {
      let x = y === cy ? cx : 0
      while (x + w <= cols && !fits(x, y, w, sz.h)) x++
      if (x + w <= cols) {
        const b = { x, y, w, h: sz.h }
        boxes.push(b)
        mark(b)
        cy = y
        cx = x + w
        break
      }
    }
  }
  const bottom = Math.max(0, ...boxes.map((b) => b.y + b.h))
  for (let changed = true; changed;) {
    changed = false
    for (let y = 0; y < bottom; y++) for (let x = 0; x < cols; x++) {
      if (!free(x, y)) continue
      const grow = boxes.findIndex((b, i) => small[i] && (
        (b.x + b.w === x && b.y <= y && y < b.y + b.h && Array.from({ length: b.h }, (_, k) => free(x, b.y + k)).every(Boolean)) ||
        (b.y + b.h === y && b.x <= x && x < b.x + b.w && Array.from({ length: b.w }, (_, k) => free(b.x + k, y)).every(Boolean))
      ))
      if (grow < 0) continue
      const b = boxes[grow]
      if (b.x + b.w === x) b.w++
      else b.h++
      mark(b)
      changed = true
    }
  }
  return boxes
}

export function KapitelLas() {
  const { id } = useParams()
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [cast, setCast] = useState<CastMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Stycket man pekar på eller har valt i berättelsen
  const [hover, setHover] = useState<number | null>(null)
  const [chosen, setChosen] = useState<number | null>(null)
  const [viewing, setViewing] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const board = useRef<HTMLDivElement>(null)
  // Väggens kolumner följer bredden
  const [cols, setCols] = useState(4)
  const [mobile, setMobile] = useState(false)
  // Form på bilder som saknar sparade mått, avläst när sidan öppnas
  const [measured, setMeasured] = useState<Record<string, number>>({})
  const [waited, setWaited] = useState(false)
  const shown = useRef(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('chronicle_chapters').select('*').eq('id', id).maybeSingle(),
      supabase.from('chronicle_entries').select('*').eq('chapter_id', id),
    ]).then(([c, e]) => {
      const err = c.error ?? e.error
      if (err) setError(err.message)
      else {
        setChapter(c.data as Chapter | null)
        setEntries(sortEntries(e.data as Entry[]))
      }
      setLoading(false)
    })
    loadCastAndStyle().then((r) => setCast(r.cast)).catch(() => {})
  }, [id])

  // Skärmdumpar som en seriebild gjorts av sitter instuckna i seriebilden i stället för som egna lappar
  const folded = useMemo(() => foldSources(entries), [entries])
  const pins = useMemo(() => toPins(folded.visible), [folded])
  const ratioOf = useCallback(
    (e: Entry) => (e.width && e.height ? e.width / e.height : measured[e.id]),
    [measured],
  )
  const unknown = useMemo(() => pins.filter((p) => p.type === 'affisch' && !(p.entry.width && p.entry.height)).map((p) => p.entry), [pins])
  // Väggen visas först när seriebildernas form är känd, så att inget hoppar under läsningen
  const ready = waited || unknown.every((e) => measured[e.id])
  useEffect(() => { if (ready) shown.current = true }, [ready])

  useEffect(() => {
    if (!unknown.length) return
    const timer = setTimeout(() => setWaited(true), 2500)
    for (const e of unknown) {
      const img = new Image()
      img.onload = () => {
        const { naturalWidth: width, naturalHeight: height } = img
        if (!width || !height) return
        if (!shown.current) setMeasured((m) => ({ ...m, [e.id]: width / height }))
        // Spara måtten så att nästa besök slipper läsa av bilden
        supabase.from('chronicle_entries').update({ width, height }).eq('id', e.id).then(() => {})
      }
      img.src = kronikaUrl(e.image_path)!
    }
    return () => clearTimeout(timer)
  }, [unknown])

  const sizes = useMemo(() => {
    const last = pins.length - 1
    return pins.map((p, i) => sizeOf(p, ratioOf(p.entry), i === last && p.type === 'affisch', cols, mobile))
  }, [pins, ratioOf, cols, mobile])
  const boxes = useMemo(() => place(sizes, pins.map((p) => p.type !== 'affisch'), mobile ? 2 : cols), [sizes, pins, cols, mobile])

  useEffect(() => {
    const el = board.current
    if (!el) return
    const mq = window.matchMedia('(max-width: 900px)')
    const measure = () => {
      setMobile(mq.matches)
      setCols(Math.max(2, Math.floor((el.clientWidth + GAP) / (COL + GAP))))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [pins.length])

  const paragraphs = useMemo(() => storyParagraphs(chapter?.story ?? null), [chapter?.story])
  const pictures = useMemo(() => pins.flatMap((p) =>
    p.type === 'affisch' ? [p.entry, ...(folded.originals.get(p.entry.id) ?? [])] : p.type === 'polaroid' ? [p.entry] : []), [pins, folded])
  const active = hover ?? chosen
  const lit = new Set(active !== null ? paragraphs[active]?.refs ?? [] : [])
  const color = (name: string) => cast.find((c) => c.name === name)?.tag_color

  const open = (entry: Entry) => {
    setViewing(pictures.indexOf(entry))
    dialog.current?.showModal()
  }
  const step = useCallback((dir: number) => {
    setViewing((v) => (v === null ? v : (v + dir + pictures.length) % pictures.length))
  }, [pictures.length])

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    d.addEventListener('keydown', onKey)
    return () => d.removeEventListener('keydown', onKey)
  }, [step])

  /** Valt stycke: visa den första lappen det berättar om. */
  function choose(i: number) {
    const next = chosen === i ? null : i
    setChosen(next)
    const ref = next !== null ? paragraphs[next].refs[0] : null
    if (ref) board.current?.querySelector(`[data-ref="${ref}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (missingTables(error ?? undefined)) return <div className="page"><h1 className="page-title">Krönikan</h1><MissingSetup /></div>
  if (!chapter || !id) {
    return (
      <div className="page">
        <div className="panel empty">{loading ? 'Laddar…' : <>Kapitlet finns inte. <Link to="/kronikan">Till krönikan</Link></>}</div>
      </div>
    )
  }

  const current = viewing !== null ? pictures[viewing] : null

  return (
    <div className="page kr-read">
      <div className="kr-read__top">
        <Link to="/kronikan" className="back"><Icon name="vanster" size={14} /> Krönikan</Link>
        <ChapterTabs id={id} />
      </div>

      <div className="kr-wood">
        <header className="kr-plaque kr-plaque--title">
          <h1>{chapter.title}</h1>
          <span className="kr-plaque__meta">
            {[[chapter.zone, chapter.subzone].filter(Boolean).join(' · '), `${weekday(chapter.played_on)} ${formatDay(chapter.played_on)}`].filter(Boolean).join(' — ')}
          </span>
        </header>

        <div className="kr-read__body">
          <aside className="kr-scroll" aria-label="Berättelsen">
            {paragraphs.length ? (
              paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={`kr-scroll__p${active === i ? ' is-active' : ''}${p.refs.length ? ' has-refs' : ''}`}
                  onMouseEnter={() => p.refs.length && setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => p.refs.length && choose(i)}
                  {...(p.refs.length ? {
                    tabIndex: 0,
                    role: 'button',
                    'aria-pressed': chosen === i,
                    onFocus: () => setHover(i),
                    onBlur: () => setHover(null),
                    onKeyDown: (ev: React.KeyboardEvent) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault()
                        choose(i)
                      }
                    },
                  } : {})}
                >
                  {p.text}
                </p>
              ))
            ) : (
              <div className="kr-scroll__empty">
                {chapter.summary && <p>{chapter.summary}</p>}
                <p>Berättelsen är inte skriven än. Låt krönikören skriva den i <Link to={`/kronikan/${id}/verkstad`}>verkstaden</Link>.</p>
              </div>
            )}
          </aside>

          {pins.length === 0 ? (
            <div className="kr-board kr-board--empty">
              <div className="kr-note" style={{ '--tilt': '-2deg' } as CSSProperties}>
                Tavlan är tom.
                <small>Släng in kvällens skärmdumpar i <Link to={`/kronikan/${id}/verkstad`}>verkstaden</Link>.</small>
              </div>
            </div>
          ) : (
            <div ref={board} className={`kr-board${lit.size ? ' is-focused' : ''}`} aria-busy={!ready}>
              {ready && pins.map((pin, n) => {
                const e = pin.entry
                const ref = shortId(e.id)
                const state = lit.size ? (lit.has(ref) ? ' is-lit' : ' is-dim') : ''
                const style = { '--tilt': `${tilt(pin.type === 'replik' ? pin.key : e.id, pin.type === 'affisch' ? 1.2 : 3)}deg`, '--i': n } as CSSProperties
                const b = boxes[n]
                const flip = tilt(e.id + n, 1) < 0 ? -1 : 1
                Object.assign(style, { gridColumn: `${b.x + 1} / span ${b.w}`, gridRow: `${b.y + 1} / span ${b.h}`, '--flip': flip })
                const ratio = ratioOf(e)
                if (ratio) Object.assign(style, { '--ar': ratio })
                // En lapp som fått fylla ett hål behåller sin egen storlek; resten av rutan blir vägg
                const own = sizes[n]
                if (b.w > own.w) Object.assign(style, { justifySelf: flip < 0 ? 'start' : 'end', width: `${own.w * COL + (own.w - 1) * GAP}px` })
                if (b.h > own.h) Object.assign(style, mobile ? { alignSelf: 'start' } : { alignSelf: 'start', height: `${own.h * ROW + (own.h - 1) * GAP}px` })
                // Seriebilden får exakt sin egen form i rutan (ramen inräknad) – inget beskärs, resten blir vägg
                if (pin.type === 'affisch' && ratio && !mobile) {
                  const spanW = b.w * COL + (b.w - 1) * GAP
                  const spanH = b.h * ROW + (b.h - 1) * GAP
                  const w = (spanH - FRAME_Y) * ratio + FRAME_X < spanW ? (spanH - FRAME_Y) * ratio + FRAME_X : spanW
                  Object.assign(style, { width: `${Math.round(w)}px`, justifySelf: 'center', alignSelf: 'start' })
                }
                const cls = `${n === pins.length - 1 && pin.type === 'affisch' ? ' kr-poster--finale' : ''}${state}`
                if (pin.type === 'affisch') {
                  return (
                    <div key={e.id} data-ref={ref} className={`kr-poster${cls}`} style={style}>
                      <button type="button" className="kr-poster__open" onClick={() => open(e)} aria-label={e.caption ?? 'Visa seriebilden'}>
                        <img src={kronikaUrl(e.image_path)!} alt={e.caption ?? ''} loading="lazy" />
                      </button>
                      {folded.originals.get(e.id)?.slice(0, 1).map((o) => (
                        <button key={o.id} type="button" className="kr-poster__original" onClick={() => open(o)} aria-label="Visa originalet från spelet">
                          <img src={kronikaUrl(o.image_path)!} alt="" loading="lazy" />
                          <span>Från spelet</span>
                        </button>
                      ))}
                    </div>
                  )
                }
                if (pin.type === 'polaroid') {
                  return (
                    <button key={e.id} data-ref={ref} className={`kr-polaroid${cls}`} style={style} onClick={() => open(e)}>
                      <img src={kronikaUrl(e.image_path)!} alt="" loading="lazy" />
                      <span>{e.caption ?? 'Utan bildtext'}</span>
                    </button>
                  )
                }
                if (pin.type === 'lapp') {
                  return (
                    <div key={e.id} data-ref={ref} className={`kr-note${cls}`} style={style}>
                      {e.caption}
                      {e.url && <a href={e.url} target="_blank" rel="noreferrer" className="kr-note__link"><Icon name="spela" size={14} /> Se klippet</a>}
                    </div>
                  )
                }
                const vol = quoteVolume(pin.quote.text)
                return (
                  <blockquote key={pin.key} data-ref={ref} className={`kr-note kr-note--${vol}${cls}`} style={style}>
                    ”{pin.quote.text}”
                    {pin.quote.who && <small style={{ '--tag': color(pin.quote.who) ?? '#6e4c22' } as CSSProperties}>— {pin.quote.who}</small>}
                  </blockquote>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <dialog ref={dialog} className="kr-viewer" onClose={() => setViewing(null)} onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        {current && (
          <figure>
            <img src={kronikaUrl(current.image_path)!} alt={current.caption ?? ''} />
            <figcaption>
              <span>{current.caption}</span>
              <span className="kr-viewer__nav">
                <button className="btn btn--small btn--ghost" onClick={() => step(-1)} aria-label="Föregående bild"><Icon name="vanster" /></button>
                <b>{viewing! + 1} / {pictures.length}</b>
                <button className="btn btn--small btn--ghost" onClick={() => step(1)} aria-label="Nästa bild"><Icon name="hoger" /></button>
                <button className="btn btn--small" onClick={() => dialog.current?.close()}>Stäng</button>
              </span>
            </figcaption>
          </figure>
        )}
      </dialog>
    </div>
  )
}
