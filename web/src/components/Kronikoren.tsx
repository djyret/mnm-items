import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { kronikaUrl, withParts, writeChronicle, writeSaga, type ChronicleDraft, type SagaDraft, type SceneDraft } from '../lib/kronikan'
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
  const { t } = useI18n()
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
            <h2 className="panel-title">{t('kronikan.writer.title')}</h2>
            <p className="note">{t('kronikan.writer.intro', { n: shots })}</p>
          </div>
          <button className="btn btn--primary" onClick={write} disabled={writing || entries.length === 0}>
            {writing ? t('kronikan.writer.writingButton') : chapter.story ? t('kronikan.writer.rewriteChronicle') : t('kronikan.writer.writeChronicle')}
          </button>
        </div>
        {writing && <p className="pulse center">{t('kronikan.writer.reading')}</p>}
        {error && <div className="alert">{error}</div>}
      </div>
    )
  }

  const use = (k: string, onUse: () => Promise<unknown>, label = t('kronikan.writer.use')) =>
    done.has(k) ? (
      <span className="badge badge--ledig">{t('kronikan.writer.done')}</span>
    ) : (
      <button className="btn btn--small" disabled={busy} onClick={() => run(async () => { await onUse(); mark(k) })}>{label}</button>
    )

  return (
    <div className={`${bare ? '' : 'panel '}kr-writer`}>
      <div className="loan__head">
        <h2 className="panel-title">{t('kronikan.writer.draftTitle')}</h2>
        <div className="actions kr-head-actions">
          <button className="btn btn--primary btn--small" disabled={busy} onClick={() => run(useAll)}>{t('kronikan.writer.useAll')}</button>
          <button className="btn btn--ghost btn--small" disabled={writing || busy} onClick={write}>{writing ? t('kronikan.writer.writing') : t('kronikan.writer.rewrite')}</button>
          <button className="btn btn--ghost btn--small" disabled={busy} onClick={() => setDraft(null)}>{t('kronikan.writer.discard')}</button>
        </div>
      </div>
      {writing && <p className="pulse center">{t('kronikan.writer.writingNew')}</p>}
      {error && <div className="alert">{error}</div>}

      <div className="kr-suggest">
        <div className="kr-suggest__row">
          <span className="guide__label">{t('kronikan.field.title')}</span>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          {use('title', () => patch({ title: draft.title }))}
        </div>
        <div className="kr-suggest__row">
          <span className="guide__label">{t('kronikan.field.summary')}</span>
          <textarea rows={2} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
          {use('summary', () => patch({ summary: draft.summary }))}
        </div>
        <div className="kr-suggest__row">
          <span className="guide__label">{t('kronikan.field.story')}</span>
          <textarea rows={12} value={draft.story} onChange={(e) => setDraft({ ...draft, story: e.target.value })} />
          {use('story', () => patch({ story: draft.story }))}
        </div>
        {emptyCaptions.length > 0 && (
          <div className="kr-suggest__row">
            <span className="guide__label">{t('kronikan.writer.captions')}</span>
            <p className="note">{t('kronikan.writer.captionsMissing', { n: emptyCaptions.length })}</p>
            {use('captions', fillCaptions, t('kronikan.writer.fillIn', { n: emptyCaptions.length }))}
          </div>
        )}
      </div>

      {draft.scenes.length > 0 && (
        <>
          <h3 className="guide__label kr-scenes-title">{t('kronikan.writer.scenes')}</h3>
          <div className="kr-scenes">
            {draft.scenes.map((s, i) => (
              <div key={i} className="kr-scene">
                <div className="kr-scene__head">
                  <b>{s.title}</b>
                  {use(`scene${i}`, () => createScene(s, i), t('kronikan.writer.createMoment'))}
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

const sagaKey = (id: string) => `mnm:saga:v1:${id}`

/** Låter Claude skriva kvällen som en längre, målande saga. Utkastet kan putsas innan det sparas. */
export function Sagoskrivaren({ chapter, onChanged }: { chapter: Chapter; onChanged: () => Promise<void> }) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<SagaDraft | null>(() => {
    try {
      const raw = localStorage.getItem(sagaKey(chapter.id))
      return raw ? (JSON.parse(raw) as SagaDraft) : null
    } catch {
      return null
    }
  })
  const [writing, setWriting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      if (draft) localStorage.setItem(sagaKey(chapter.id), JSON.stringify(draft))
      else localStorage.removeItem(sagaKey(chapter.id))
    } catch {
      /* privat läge */
    }
  }, [chapter.id, draft])

  async function write() {
    setWriting(true)
    setError(null)
    try {
      setDraft(await writeSaga(chapter.id))
    } catch (e) {
      setError((e as Error).message)
    }
    setWriting(false)
  }

  async function save() {
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('chronicle_chapters').update({ saga: draft!.saga }).eq('id', chapter.id)
    if (error) setError(error.message)
    else {
      setDraft(null)
      await onChanged()
    }
    setBusy(false)
  }

  return (
    <div className="kr-writer">
      <div className="kr-writer__intro">
        <div>
          <h2 className="panel-title">{t('kronikan.field.saga')}</h2>
          <p className="note">{t('kronikan.sagaWriter.intro')}</p>
        </div>
        <div className="actions kr-head-actions">
          {chapter.saga && !draft && <Link className="btn btn--small btn--ghost" to={`/kronikan/${chapter.id}/saga`}>{t('kronikan.sagaWriter.read')}</Link>}
          <button className="btn btn--primary" onClick={write} disabled={writing || busy}>
            {writing ? t('kronikan.sagaWriter.writingButton') : draft || chapter.saga ? t('kronikan.sagaWriter.rewrite') : t('kronikan.sagaWriter.write')}
          </button>
        </div>
      </div>
      {writing && <p className="pulse center">{t('kronikan.sagaWriter.reading')}</p>}
      {error && <div className="alert">{error}</div>}
      {draft && (
        <div className="kr-suggest">
          <p className="note">{withParts(t('kronikan.sagaWriter.suggestedTitle'), { title: <b>{draft.title}</b> })}</p>
          <textarea rows={16} value={draft.saga} onChange={(e) => setDraft({ ...draft, saga: e.target.value })} />
          <div className="actions">
            <button className="btn btn--primary btn--small" disabled={busy} onClick={save}>{chapter.saga ? t('kronikan.sagaWriter.replace') : t('kronikan.sagaWriter.save')}</button>
            <button className="btn btn--ghost btn--small" disabled={busy} onClick={() => setDraft(null)}>{t('kronikan.writer.discard')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
