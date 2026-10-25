import { useEffect, useState } from 'react'
import { kronikaUrl, writeChronicle, type ChronicleDraft, type SceneDraft } from '../lib/kronikan'
import { supabase } from '../lib/supabase'
import type { CastMember, Chapter, Entry } from '../lib/types'

// Versionen höjs när krönikören ändras, så gamla sparade utkast inte dyker upp igen
const draftKey = (id: string) => `mnm:kronikor:v2:${id}`

function readDraft(id: string): ChronicleDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(id))
    return raw ? (JSON.parse(raw) as ChronicleDraft) : null
  } catch {
    return null
  }
}

function storeDraft(id: string, d: ChronicleDraft | null) {
  try {
    if (d) localStorage.setItem(draftKey(id), JSON.stringify(d))
    else localStorage.removeItem(draftKey(id))
  } catch {
    /* privat läge */
  }
}

/** Låter Claude skriva kvällens krönika och visar utkastet att plocka ur. */
export function Kronikoren({ chapter, entries, cast, onChanged, bare = false }: {
  chapter: Chapter
  entries: Entry[]
  cast: CastMember[]
  onChanged: () => Promise<void>
  /** Inuti verkstadens kontrollpanel: ingen egen ram */
  bare?: boolean
}) {
  // Utkastet sparas lokalt så det inte går förlorat om man lämnar sidan
  const [draft, setDraft] = useState<ChronicleDraft | null>(() => readDraft(chapter.id))
  const [writing, setWriting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())

  useEffect(() => storeDraft(chapter.id, draft), [chapter.id, draft])

  const mark = (...keys: string[]) => setDone((s) => new Set([...s, ...keys]))
  const shots = entries.filter((e) => e.image_path).length
  const color = (name: string) => cast.find((c) => c.name === name)?.tag_color
  const emptyCaptions = (draft?.captions ?? []).filter((c) => !entries.find((e) => e.id === c.entry_id)?.caption)

  async function write() {
    setWriting(true)
    setError(null)
    try {
      setDraft(await writeChronicle(chapter.id))
      setDone(new Set())
    } catch (e) {
      setError((e as Error).message)
    }
    setWriting(false)
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await onChanged()
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  const patch = async (changes: Partial<Chapter>) => {
    const { error } = await supabase.from('chronicle_chapters').update(changes).eq('id', chapter.id)
    if (error) throw error
  }

  const fillCaptions = async () => {
    for (const c of emptyCaptions) {
      const { error } = await supabase.from('chronicle_entries').update({ caption: c.caption }).eq('id', c.entry_id)
      if (error) throw error
    }
  }

  /** Scenen hamnar direkt efter den sista skärmdumpen den bygger på. */
  const createScene = async (s: SceneDraft, i: number) => {
    const known = s.cast_names.filter((n) => cast.some((c) => c.name === n))
    const after = entries.filter((e) => s.source_ids.includes(e.id)).map((e) => e.position)
    const position = after.length ? Math.max(...after) + 0.001 * (i + 1) : Date.now() / 1000 + i
    const { error } = await supabase.from('chronicle_entries').insert({
      chapter_id: chapter.id,
      kind: 'serie',
      caption: s.caption,
      cast_names: known,
      pet_names: Object.fromEntries(Object.entries(s.pet_names).filter(([k]) => known.includes(k))),
      quotes: s.quotes.filter((q) => q.text.trim()),
      subzone: s.subzone,
      source_ids: s.source_ids,
      position,
    })
    if (error) throw error
  }

  const useAll = async () => {
    const changes: Partial<Chapter> = {}
    if (!done.has('title')) changes.title = draft!.title
    if (!done.has('summary')) changes.summary = draft!.summary
    if (!done.has('story')) changes.story = draft!.story
    await patch(changes)
    if (!done.has('captions')) await fillCaptions()
    for (const [i, s] of draft!.scenes.entries()) if (!done.has(`scene${i}`)) await createScene(s, i)
    mark('title', 'summary', 'story', 'captions', ...draft!.scenes.map((_, i) => `scene${i}`))
  }

  if (!draft) {
    return (
      <div className={`${bare ? '' : 'panel '}kr-writer`}>
        <div className="kr-writer__intro">
          <div>
            <h2 className="panel-title">Krönikören</h2>
            <p className="note">Läser kvällens {shots} bilder – chatt, stridslogg, namnskyltar – och föreslår berättelse, bildtexter och seriescener.</p>
          </div>
          <button className="btn btn--primary" onClick={write} disabled={writing || entries.length === 0}>
            {writing ? 'Krönikören skriver…' : chapter.story ? 'Skriv om krönikan' : 'Skriv kvällens krönika'}
          </button>
        </div>
        {writing && <p className="pulse center">Läser skärmdumparna och skriver…</p>}
        {error && <div className="alert">{error}</div>}
      </div>
    )
  }

  const use = (k: string, onUse: () => Promise<unknown>, label = 'Använd') =>
    done.has(k) ? (
      <span className="badge badge--ledig">Klart</span>
    ) : (
      <button className="btn btn--small" disabled={busy} onClick={() => run(async () => { await onUse(); mark(k) })}>{label}</button>
    )

  return (
    <div className={`${bare ? '' : 'panel '}kr-writer`}>
      <div className="loan__head">
        <h2 className="panel-title">Krönikörens utkast</h2>
        <div className="actions kr-head-actions">
          <button className="btn btn--primary btn--small" disabled={busy} onClick={() => run(useAll)}>Använd allt</button>
          <button className="btn btn--ghost btn--small" disabled={writing || busy} onClick={write}>{writing ? 'Skriver…' : 'Skriv om'}</button>
          <button className="btn btn--ghost btn--small" disabled={busy} onClick={() => setDraft(null)}>Släng utkastet</button>
        </div>
      </div>
      {writing && <p className="pulse center">Skriver ett nytt utkast…</p>}
      {error && <div className="alert">{error}</div>}

      <div className="kr-suggest">
        <div className="kr-suggest__row">
          <span className="guide__label">Titel</span>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          {use('title', () => patch({ title: draft.title }))}
        </div>
        <div className="kr-suggest__row">
          <span className="guide__label">Sammanfattning</span>
          <textarea rows={2} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
          {use('summary', () => patch({ summary: draft.summary }))}
        </div>
        <div className="kr-suggest__row">
          <span className="guide__label">Berättelsen</span>
          <textarea rows={12} value={draft.story} onChange={(e) => setDraft({ ...draft, story: e.target.value })} />
          {use('story', () => patch({ story: draft.story }))}
        </div>
        {emptyCaptions.length > 0 && (
          <div className="kr-suggest__row">
            <span className="guide__label">Bildtexter</span>
            <p className="note">{emptyCaptions.length} bilder saknar bildtext och har fått ett förslag.</p>
            {use('captions', fillCaptions, `Fyll i ${emptyCaptions.length}`)}
          </div>
        )}
      </div>

      {draft.scenes.length > 0 && (
        <>
          <h3 className="guide__label kr-scenes-title">Förslag på seriebilder</h3>
          <div className="kr-scenes">
            {draft.scenes.map((s, i) => (
              <div key={i} className="kr-scene">
                <div className="kr-scene__head">
                  <b>{s.title}</b>
                  {use(`scene${i}`, () => createScene(s, i), 'Skapa ögonblick')}
                </div>
                <p className="kr-entry__caption">{s.caption}</p>
                {s.quotes.length > 0 && (
                  <ul className="kr-quotes">
                    {s.quotes.map((q, j) => <li key={j}>{q.who && <b style={{ color: color(q.who) }}>{q.who}:</b>} „{q.text}”</li>)}
                  </ul>
                )}
                <div className="kr-cast">
                  {s.cast_names.map((n) => <span key={n} style={{ color: color(n) }}>{s.pet_names[n] ? `${s.pet_names[n]} (${n})` : n}</span>)}
                </div>
                {s.source_ids.length > 0 && (
                  <div className="kr-strip">
                    {s.source_ids.map((sid) => {
                      const src = entries.find((e) => e.id === sid)
                      return src?.image_path ? <img key={sid} src={kronikaUrl(src.image_path)!} alt="" /> : null
                    })}
                  </div>
                )}
                <small className="note">{s.why}</small>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
