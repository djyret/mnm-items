import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { foldSources, formatDay, kronikaUrl, shortId, sortEntries, storyParagraphs, weekday } from '../lib/kronikan'
import { supabase } from '../lib/supabase'
import type { Chapter, Entry } from '../lib/types'

/** Tecken per sekund när krönikören skriver */
const CPS = 26
/** Tid att läsa klart stycket innan det byts */
const HOLD = 4000
/** Kortaste tid en bild står */
const MIN_SLIDE = 6500
const TITLE = 5000
const END = 6000
/** Hur länge nästa bild bränner sig igenom den förra */
const BURN_MS = 2200

/** Ett avsnitt i bildspelet: ett stycke som skrivs medan dess bilder visas i tur och ordning. */
interface Beat {
  kind: 'titel' | 'text' | 'slut'
  text: string
  slides: number[]
  duration: number
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Bilder hör till stycket som nämner dem. Bilder ingen nämner (krönikan saknar ofta hänvisningar)
 * sprids jämnt mellan de närmaste nämnda bilderna, så att varje stycke får sina egna.
 */
function spread(anchors: (number | null)[], paragraphs: number): number[] {
  const n = anchors.length
  const out = new Array<number>(n)
  const known = anchors.flatMap((a, i) => (a === null ? [] : [i]))
  // Låtsasankare före första och efter sista bilden: början och slutet av berättelsen
  const points = [{ i: -1, p: 0 }, ...known.map((i) => ({ i, p: anchors[i]! })), { i: n, p: paragraphs - 1 }]
  for (let k = 0; k < points.length - 1; k++) {
    const a = points[k]
    const b = points[k + 1]
    if (a.i >= 0 && a.i < n) out[a.i] = a.p
    const gap = b.i - a.i
    for (let i = a.i + 1; i < b.i; i++) {
      const t = (i - a.i) / gap
      // Utan ankare alls: fördela bilderna rakt över styckena
      out[i] = known.length ? Math.round(a.p + (b.p - a.p) * t) : Math.min(paragraphs - 1, Math.floor((i / n) * paragraphs))
    }
  }
  // Ordningen får aldrig gå bakåt
  for (let i = 1; i < n; i++) out[i] = Math.max(out[i], out[i - 1])
  return out
}

// ---------- Bränningen ----------

function seedOf(text: string) {
  let h = 2166136261
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

/**
 * Nästa bild bränner sig fram genom den förra: en oregelbunden front (avstånd från en punkt plus brus)
 * flyttas över bilden. Masken räknas i låg upplösning och skalas upp mjukt; glöd och sotkant
 * ritas på en egen duk ovanpå.
 */
function burn(el: HTMLElement, ember: HTMLCanvasElement, seed: string, done: () => void): () => void {
  const W = 168
  const H = Math.max(64, Math.round((W * window.innerHeight) / window.innerWidth))
  let s = seedOf(seed)
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const layer = (cells: number) => {
    const gw = cells + 1
    const gh = Math.ceil((cells * H) / W) + 1
    const g = Float32Array.from({ length: gw * gh }, rnd)
    return (x: number, y: number) => {
      const fx = (x / W) * cells
      const fy = (y / W) * cells
      const ix = Math.floor(fx)
      const iy = Math.floor(fy)
      const tx = smooth(fx - ix)
      const ty = smooth(fy - iy)
      const at = (cx: number, cy: number) => g[Math.min(gh - 1, cy) * gw + Math.min(gw - 1, cx)]
      const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * tx
      const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * tx
      return top + (bottom - top) * ty
    }
  }
  const coarse = layer(7)
  const fine = layer(23)
  const ox = (0.25 + rnd() * 0.5) * W
  const oy = (0.3 + rnd() * 0.4) * H
  const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - ox, y - oy)))
  const field = new Float32Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    field[y * W + x] = 0.7 * (Math.hypot(x - ox, y - oy) / far) + 0.3 * (0.68 * coarse(x, y) + 0.32 * fine(x, y))
  }
  // Sträck ut fältet till 0–1 så att fronten rör sig i jämn takt över hela bilden
  let lo = Infinity
  let hi = -Infinity
  for (const v of field) { lo = Math.min(lo, v); hi = Math.max(hi, v) }
  for (let i = 0; i < field.length; i++) field[i] = (field[i] - lo) / (hi - lo)

  const mask = document.createElement('canvas')
  mask.width = ember.width = W
  mask.height = ember.height = H
  const mctx = mask.getContext('2d')!
  const ectx = ember.getContext('2d')!
  const mimg = mctx.createImageData(W, H)
  const eimg = ectx.createImageData(W, H)
  const SOFT = 0.018

  let frame = 0
  const start = performance.now()
  const draw = (now: number) => {
    const t = Math.min(1, (now - start) / BURN_MS)
    const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
    const front = -0.06 + eased * 1.12
    const m = mimg.data
    const e = eimg.data
    for (let i = 0; i < field.length; i++) {
      const d = field[i] - front
      m[i * 4 + 3] = d <= -SOFT ? 255 : d >= 0 ? 0 : (-d / SOFT) * 255
      const p = i * 4
      if (d > -0.014 && d < 0.02) {
        // Glödkanten: vitgul kärna som går över i orange
        const k = 1 - Math.abs(d - 0.003) / 0.017
        const hot = Math.max(0, 1 - Math.abs(d) / 0.007)
        e[p] = 255
        e[p + 1] = 120 + 110 * hot
        e[p + 2] = 30 + 120 * hot
        e[p + 3] = Math.max(0, k) * 235
      } else if (d >= 0.02 && d < 0.055) {
        // Sotet som går före elden
        e[p] = 28
        e[p + 1] = 12
        e[p + 2] = 4
        e[p + 3] = (1 - (d - 0.02) / 0.035) * 150
      } else e[p + 3] = 0
    }
    mctx.putImageData(mimg, 0, 0)
    ectx.putImageData(eimg, 0, 0)
    const url = `url(${mask.toDataURL()})`
    el.style.maskImage = url
    el.style.setProperty('-webkit-mask-image', url)
    if (t < 1) frame = requestAnimationFrame(draw)
    else finish()
  }
  const clear = () => {
    el.style.maskImage = ''
    el.style.removeProperty('-webkit-mask-image')
    ectx.clearRect(0, 0, W, H)
  }
  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    clear()
    done()
  }
  frame = requestAnimationFrame(draw)
  return () => {
    cancelAnimationFrame(frame)
    finished = true
    clear()
  }
}

// ---------- Bildspelet ----------

export function Bildspel() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [beat, setBeat] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [idle, setIdle] = useState(false)
  // Bilden överst och bilden den bränner bort
  const [front, setFront] = useState(-1)
  const [back, setBack] = useState(-1)
  const stage = useRef<HTMLDivElement>(null)
  const ember = useRef<HTMLCanvasElement>(null)
  const slideEls = useRef(new Map<number, HTMLDivElement>())

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('chronicle_chapters').select('*').eq('id', id).maybeSingle(),
      supabase.from('chronicle_entries').select('*').eq('chapter_id', id),
    ]).then(([c, e]) => {
      setChapter((c.data as Chapter | null) ?? null)
      setEntries(sortEntries((e.data as Entry[]) ?? []))
      setLoading(false)
    })
  }, [id])

  // Sidan bakom ska inte kunna rullas medan spelet visas
  useEffect(() => {
    const html = document.documentElement
    html.style.overflow = 'hidden'
    return () => { html.style.overflow = '' }
  }, [])

  // Bilderna i kvällens ordning: seriebilder och skärmdumpar som inte gått upp i en seriebild
  const { slides, slideOf } = useMemo(() => {
    const { visible, originals } = foldSources(entries)
    const slides = visible.filter((e) => e.image_path)
    const slideOf = new Map<string, number>()
    slides.forEach((s, i) => {
      slideOf.set(shortId(s.id), i)
      for (const o of originals.get(s.id) ?? []) slideOf.set(shortId(o.id), i)
    })
    return { slides, slideOf }
  }, [entries])

  const beats = useMemo<Beat[]>(() => {
    if (!chapter) return []
    const paragraphs = storyParagraphs(chapter.story)
    const timed = (text: string, n: number) => Math.max((text.length / CPS) * 1000 + HOLD, n * MIN_SLIDE)
    const body: Beat[] = []
    if (paragraphs.length) {
      const anchors = slides.map((_, s) => {
        const p = paragraphs.findIndex((para) => para.refs.some((r) => slideOf.get(r) === s))
        return p < 0 ? null : p
      })
      const owner = spread(anchors, paragraphs.length)
      paragraphs.forEach((p, i) => {
        const own = owner.flatMap((o, s) => (o === i ? [s] : []))
        body.push({ kind: 'text', text: p.text, slides: own, duration: timed(p.text, own.length) })
      })
    } else {
      // Ingen berättelse än: bildtexterna får berätta
      slides.forEach((s, i) => body.push({ kind: 'text', text: s.caption ?? '', slides: [i], duration: timed(s.caption ?? '', 1) }))
    }
    return [
      { kind: 'titel', text: '', slides: slides.length ? [0] : [], duration: TITLE },
      ...body,
      { kind: 'slut', text: '', slides: [], duration: END },
    ]
  }, [chapter, slides, slideOf])

  const current = beats[beat]
  // Stycken utan egna bilder låter bilden som redan står uppe stå kvar
  const shownSlide = useMemo(() => {
    for (let b = beat; b >= 0; b--) {
      const own = beats[b]?.slides ?? []
      if (!own.length) continue
      if (b < beat) return own[own.length - 1]
      const per = beats[b].duration / own.length
      return own[Math.min(own.length - 1, Math.floor(elapsed / per))]
    }
    return slides.length ? 0 : -1
  }, [beats, beat, elapsed, slides.length])

  // Ny bild: den gamla blir kvar under tills bränningen är klar
  useEffect(() => {
    if (shownSlide === front) return
    setBack(front)
    setFront(shownSlide)
  }, [shownSlide, front])

  useLayoutEffect(() => {
    const el = slideEls.current.get(front)
    if (back < 0 || !el || !ember.current) return
    if (reducedMotion()) {
      const t = setTimeout(() => setBack(-1), 500)
      return () => clearTimeout(t)
    }
    return burn(el, ember.current, slides[front]?.id ?? String(front), () => setBack(-1))
  }, [front, back, slides])

  const go = useCallback((to: number) => {
    if (to < 0 || to >= beats.length) return
    setBeat(to)
    setElapsed(0)
  }, [beats.length])

  // Klockan går bara när spelet spelar
  useEffect(() => {
    if (!playing || !current) return
    let last = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      setElapsed((e) => e + (now - last))
      last = now
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [playing, current])

  useEffect(() => {
    if (!current || elapsed < current.duration) return
    if (beat < beats.length - 1) go(beat + 1)
    else setPlaying(false)
  }, [elapsed, current, beat, beats.length, go])

  // Nästa bild laddas i förväg så att bränningen inte väntar på nätet
  useEffect(() => {
    const next = slides[shownSlide + 1]
    if (next) new Image().src = kronikaUrl(next.image_path)!
  }, [shownSlide, slides])

  const close = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    navigate(`/kronikan/${id}`)
  }, [id, navigate])

  function start() {
    setStarted(true)
    setPlaying(true)
    go(0)
    stage.current?.requestFullscreen?.().catch(() => {})
  }

  useEffect(() => {
    if (!started) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
      if (e.key === 'ArrowRight') go(beat + 1)
      if (e.key === 'ArrowLeft') go(beat - 1)
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [started, beat, go, close])

  // Lämnar man helskärm med Esc avslutas spelet också
  useEffect(() => {
    const onChange = () => { if (started && !document.fullscreenElement) close() }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [started, close])

  // Kontrollerna tonar bort när musen står still
  useEffect(() => {
    if (!started) return
    let timer = setTimeout(() => setIdle(true), 2500)
    const wake = () => {
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), 2500)
    }
    window.addEventListener('mousemove', wake)
    window.addEventListener('touchstart', wake)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousemove', wake)
      window.removeEventListener('touchstart', wake)
    }
  }, [started])

  // Orden i stycket, med tidpunkten då vart och ett ska sugas in i pergamentet
  const words = useMemo(() => {
    if (current?.kind !== 'text' || !current.text) return null
    const text = current.text
    const parts = text.slice(1).split(/(\s+)/)
    let at = 1
    return {
      cap: text[0],
      words: parts.map((w) => {
        const delay = at / CPS
        at += w.length
        return { w, delay }
      }),
    }
  }, [current])

  if (!chapter || !id) {
    return (
      <div className="page">
        <div className="panel empty">{loading ? 'Laddar…' : <>Kapitlet finns inte. <Link to="/kronikan">Till krönikan</Link></>}</div>
      </div>
    )
  }

  const meta = [[chapter.zone, chapter.subzone].filter(Boolean).join(' · '), `${weekday(chapter.played_on)} ${formatDay(chapter.played_on)}`]
    .filter(Boolean).join(' — ')
  const total = beats.reduce((s, b) => s + b.duration, 0)
  const progress = total ? (beats.slice(0, beat).reduce((s, b) => s + b.duration, 0) + Math.min(elapsed, current?.duration ?? 0)) / total : 0
  const showStory = started && current?.kind === 'text' && words

  return (
    <div
      ref={stage}
      className={`kr-show${started ? ' is-started' : ''}${idle && playing ? ' is-idle' : ''}${playing ? '' : ' is-paused'}${current?.kind === 'slut' ? ' is-end' : ''}`}
    >
      {slides.map((s, i) => {
        const url = kronikaUrl(s.image_path)!
        const role = i === front ? ' is-front' : i === back ? ' is-back' : ''
        // Bara bilden som visas och grannarna runt den ligger i DOM:en
        if (!role && Math.abs(i - front) > 1) return null
        return (
          <div
            key={s.id}
            ref={(el) => { if (el) slideEls.current.set(i, el); else slideEls.current.delete(i) }}
            className={`kr-show__slide kr-show__slide--${i % 4}${role}`}
            aria-hidden={i !== front}
          >
            <img className="kr-show__blur" src={url} alt="" />
            <img className="kr-show__img" src={url} alt={s.caption ?? ''} />
          </div>
        )
      })}
      <canvas ref={ember} className="kr-show__ember" aria-hidden="true" />

      {(!started || current?.kind === 'titel' || current?.kind === 'slut') && (
        <div className="kr-show__card" key={started ? current?.kind : 'start'}>
          <header className="kr-plaque--title kr-show__plaque" style={{ '--tilt': '-1deg' } as CSSProperties}>
            <h1>{current?.kind === 'slut' && started ? 'Slut' : chapter.title}</h1>
            <span className="kr-plaque__meta">{current?.kind === 'slut' && started ? chapter.title : meta}</span>
          </header>
          {!started && (
            <>
              <button type="button" className="btn btn--primary kr-show__play" onClick={start} disabled={!beats.length}>
                <Icon name="spela" size={18} /> Spela upp
              </button>
              <Link to={`/kronikan/${id}`} className="kr-show__back">Tillbaka till kapitlet</Link>
            </>
          )}
          {started && current?.kind === 'slut' && (
            <span className="kr-show__end">
              <button type="button" className="btn btn--primary" onClick={() => { go(0); setPlaying(true) }}>Spela igen</button>
              <button type="button" className="btn btn--ghost" onClick={close}>Tillbaka till kapitlet</button>
            </span>
          )}
        </div>
      )}

      {started && (
        <div className={`kr-show__roll${showStory ? ' is-open' : ''}`} aria-live="polite">
          {showStory && (
            <p key={beat} className="kr-show__text" aria-label={current.text}>
              <span className="kr-show__cap kr-ink" aria-hidden="true">{words.cap}</span>
              {words.words.map((w, i) => (/^\s+$/.test(w.w)
                ? w.w
                : <span key={i} className="kr-ink" aria-hidden="true" style={{ animationDelay: `${w.delay.toFixed(2)}s` }}>{w.w}</span>))}
            </p>
          )}
        </div>
      )}

      {started && (
        <div className="kr-show__bar">
          <div className="kr-show__progress" style={{ transform: `scaleX(${progress})` }} />
          <span className="kr-show__controls">
            <button type="button" className="btn btn--small btn--ghost" onClick={() => go(beat - 1)} disabled={beat === 0} aria-label="Föregående" title="Föregående (←)">
              <Icon name="vanster" />
            </button>
            <button type="button" className="btn btn--small" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pausa' : 'Spela'} title="Pausa / spela (mellanslag)">
              <Icon name={playing ? 'paus' : 'spela'} />
            </button>
            <button type="button" className="btn btn--small btn--ghost" onClick={() => go(beat + 1)} disabled={beat >= beats.length - 1} aria-label="Nästa" title="Nästa (→)">
              <Icon name="hoger" />
            </button>
            <button type="button" className="btn btn--small btn--ghost" onClick={close} aria-label="Avsluta" title="Avsluta (Esc)">
              <Icon name="stang" />
            </button>
          </span>
        </div>
      )}
    </div>
  )
}

