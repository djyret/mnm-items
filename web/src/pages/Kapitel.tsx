import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  KIND_LABELS, buildPrompt, deleteKronika, formatDay, imageFiles, kronikaUrl, loadCastAndStyle,
  missingTables, sortEntries, storeImage, weekday,
} from '../lib/kronikan'
import { supabase } from '../lib/supabase'
import type { CastMember, Chapter, Entry, EntryKind, Quote } from '../lib/types'
import { Kronikoren } from '../components/Kronikoren'
import { MissingSetup } from './Kronikan'

type EntryDraft = Pick<Entry, 'kind' | 'image_path' | 'caption' | 'quotes' | 'cast_names' | 'pet_names' | 'source_ids' | 'subzone' | 'url'>

const blankMoment = (): EntryDraft => ({
  kind: 'serie', image_path: null, caption: null, quotes: [], cast_names: [], pet_names: {}, source_ids: [], subzone: null, url: null,
})

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

// ---------- Bildprompt ----------

function PromptBox({ prompt, people, sources }: { prompt: string; people: CastMember[]; sources: Entry[] }) {
  const [copied, setCopied] = useState(false)
  const refs = people.filter((c) => c.ref_path)
  const missing = people.filter((c) => !c.ref_path)
  return (
    <div className="kr-prompt">
      <div className="loan__outhead">
        <span className="guide__label">Bildprompt till ChatGPT</span>
        <button
          type="button"
          className="btn btn--small btn--primary"
          onClick={async () => {
            await navigator.clipboard.writeText(prompt)
            setCopied(true)
            setTimeout(() => setCopied(false), 1600)
          }}
        >
          {copied ? 'Kopierad!' : 'Kopiera prompt'}
        </button>
      </div>
      <textarea readOnly rows={10} value={prompt} onFocus={(e) => e.target.select()} />
      {sources.some((e) => e.image_path) && (
        <div className="kr-prompt__refs">
          <span className="chips__label">Skärmdumpar från ögonblicket – dra in dem också:</span>
          <div className="kr-refs kr-refs--wide">
            {sources.filter((e) => e.image_path).map((e) => (
              <a key={e.id} href={kronikaUrl(e.image_path)!} target="_blank" rel="noreferrer">
                <img src={kronikaUrl(e.image_path)!} alt={e.caption ?? ''} />
              </a>
            ))}
          </div>
        </div>
      )}
      {people.length > 0 && (
        <div className="kr-prompt__refs">
          <span className="chips__label">Dra in referensbilderna i ChatGPT tillsammans med prompten:</span>
          <div className="kr-refs">
            {refs.map((c) => (
              <a key={c.id} href={kronikaUrl(c.ref_path)!} target="_blank" rel="noreferrer" title={c.name}>
                <img src={kronikaUrl(c.ref_path)!} alt={c.name} />
                <span>{c.name}</span>
              </a>
            ))}
          </div>
          {missing.length > 0 && (
            <small className="note">
              Saknar referensbild: {missing.map((c) => c.name).join(', ')}. Lägg till i <Link to="/kronikan/stil">stilbibeln</Link>.
            </small>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Redigera ett minne ----------

function EntryEditor({ draft, onChange, chapter, cast, petNames, sources, style, uploading, onSave, onCancel, saving, isNew }: {
  draft: EntryDraft
  onChange: (d: EntryDraft) => void
  chapter: Chapter
  cast: CastMember[]
  /** Senast använda namn per husdjur i kapitlet */
  petNames: Record<string, string>
  sources: Entry[]
  style: string
  uploading: boolean
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isNew: boolean
}) {
  const set = <K extends keyof EntryDraft>(k: K, v: EntryDraft[K]) => onChange({ ...draft, [k]: v })
  const setQuote = (i: number, q: Partial<Quote>) => set('quotes', draft.quotes.map((x, j) => (j === i ? { ...x, ...q } : x)))
  const fileInput = useRef<HTMLInputElement>(null)
  const people = draft.cast_names.map((n) => cast.find((c) => c.name === n)).filter((c): c is CastMember => !!c)
  const hasImage = draft.kind === 'serie' || draft.kind === 'skarmdump'

  return (
    <div className="kr-editor">
      <div className="chips">
        {(Object.keys(KIND_LABELS) as EntryKind[]).map((k) => (
          <button key={k} type="button" className={`chip${draft.kind === k ? ' is-active' : ''}`} onClick={() => set('kind', k)}>
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>

      {hasImage && (
        <div className={`kr-editor__image${draft.image_path ? '' : ' kr-editor__image--empty'}`} onClick={() => fileInput.current?.click()} role="button" tabIndex={0}>
          {uploading ? (
            <span className="pulse">Laddar upp…</span>
          ) : draft.image_path ? (
            <img src={kronikaUrl(draft.image_path)!} alt="" />
          ) : (
            <span>
              {draft.kind === 'serie' ? 'Kopiera prompten nedan till ChatGPT, klistra sedan in bilden här' : 'Klistra in skärmdumpen här'} med <kbd>Ctrl</kbd>+<kbd>V</kbd>
              <small>…eller klicka för att välja fil</small>
            </span>
          )}
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) window.dispatchEvent(new CustomEvent('kr-file', { detail: f }))
            e.target.value = ''
          }} />
        </div>
      )}

      <label className="field">
        <span>{draft.kind === 'serie' ? 'Vad händer i bilden?' : 'Vad hände?'}</span>
        <textarea rows={3} value={draft.caption ?? ''} onChange={(e) => set('caption', e.target.value || null)}
          placeholder={draft.kind === 'serie' ? 't.ex. Daremx portar upp till toppen medan Gabbex och Derinx dör bland skelett och fladdermöss' : ''} />
      </label>

      {draft.kind === 'klipp' && (
        <label className="field"><span>Länk till klippet</span><input value={draft.url ?? ''} onChange={(e) => set('url', e.target.value || null)} placeholder="YouTube, Medal, Twitch …" /></label>
      )}

      <div className="field">
        <span>Med i bild</span>
        <div className="chips">
          {cast.map((c) => (
            <button key={c.id} type="button" className={`chip${draft.cast_names.includes(c.name) ? ' is-active' : ''}`}
              style={{ '--tag': c.tag_color } as React.CSSProperties}
              onClick={() => {
                const on = !draft.cast_names.includes(c.name)
                const prev = petNames[c.name]
                onChange({
                  ...draft,
                  cast_names: toggle(draft.cast_names, c.name),
                  // Husdjuret heter troligen samma som förra gången i kapitlet
                  pet_names: on && c.role === 'husdjur' && prev && !draft.pet_names[c.name]
                    ? { ...draft.pet_names, [c.name]: prev }
                    : draft.pet_names,
                })
              }}>
              <i className="kr-dot" />{c.name}
            </button>
          ))}
        </div>
      </div>

      {people.filter((c) => c.role === 'husdjur').map((c) => (
        <label key={c.id} className="field">
          <span>Vad hette {c.name} den här gången?</span>
          <input value={draft.pet_names[c.name] ?? ''} placeholder="Namnet efter summon – tomt ger ingen namnskylt"
            onChange={(e) => set('pet_names', { ...draft.pet_names, [c.name]: e.target.value })} />
        </label>
      ))}

      <div className="field">
        <span>Repliker</span>
        {draft.quotes.map((q, i) => (
          <div key={i} className="quick__row kr-quote">
            <select value={q.who} onChange={(e) => setQuote(i, { who: e.target.value })}>
              <option value="">Berättarruta</option>
              {cast.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <input value={q.text} onChange={(e) => setQuote(i, { text: e.target.value })} placeholder="t.ex. NU!!!" />
            <button type="button" className="icon-btn" aria-label="Ta bort repliken" onClick={() => set('quotes', draft.quotes.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <div className="chips chips--add">
          <button type="button" className="chip" onClick={() => set('quotes', [...draft.quotes, { who: draft.cast_names[0] ?? '', text: '' }])}>+ Replik</button>
        </div>
      </div>

      {draft.kind !== 'anteckning' && draft.kind !== 'klipp' && (
        <label className="field">
          <span>Delområde, om annat än kapitlets</span>
          <input value={draft.subzone ?? ''} onChange={(e) => set('subzone', e.target.value || null)} placeholder={chapter.subzone ?? 't.ex. The Keep'} />
        </label>
      )}

      {draft.kind === 'serie' && <PromptBox prompt={buildPrompt(style, chapter, draft, cast)} people={people} sources={sources} />}

      <div className="actions">
        <button className="btn btn--primary" onClick={onSave} disabled={saving || uploading}>{saving ? 'Sparar…' : isNew ? 'Spara minnet' : 'Spara'}</button>
        <button className="btn btn--ghost" onClick={onCancel} disabled={saving}>Avbryt</button>
      </div>
    </div>
  )
}

// ---------- Visa ett minne ----------

function EntryView({ entry, chapter, cast, isCover, first, last, onEdit, onMove, onCover, onDelete }: {
  entry: Entry
  chapter: Chapter
  cast: CastMember[]
  isCover: boolean
  first: boolean
  last: boolean
  onEdit: () => void
  onMove: (dir: -1 | 1) => void
  onCover: () => void
  onDelete: () => void
}) {
  const url = kronikaUrl(entry.image_path)
  const color = (name: string) => cast.find((c) => c.name === name)?.tag_color
  return (
    <article className={`frame kr-entry kr-entry--${entry.kind}`}>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="kr-entry__img"><img src={url} alt={entry.caption ?? ''} loading="lazy" /></a>
      ) : entry.kind === 'serie' ? (
        <button type="button" className="kr-entry__wait" onClick={onEdit}>
          <b>Väntar på bild</b>
          <span>Öppna för att kopiera prompten och klistra in bilden</span>
        </button>
      ) : null}
      <div className="kr-entry__body">
        <div className="kr-entry__meta">
          <span className={`badge kr-kind kr-kind--${entry.kind}`}>{KIND_LABELS[entry.kind]}</span>
          {isCover && <span className="badge badge--main">Omslag</span>}
          {entry.subzone && entry.subzone !== chapter.subzone && <span className="kr-zone">{entry.subzone}</span>}
        </div>
        {entry.caption && <p className="kr-entry__caption">{entry.caption}</p>}
        {entry.kind === 'klipp' && entry.url && <p><a href={entry.url} target="_blank" rel="noreferrer">▶ Se klippet</a></p>}
        {entry.quotes.length > 0 && (
          <ul className="kr-quotes">
            {entry.quotes.map((q, i) => (
              <li key={i}>
                {q.who && <b style={{ color: color(q.who) }}>{q.who}:</b>} „{q.text}”
              </li>
            ))}
          </ul>
        )}
        {entry.cast_names.length > 0 && (
          <div className="kr-cast">
            {entry.cast_names.map((n) => <span key={n} style={{ color: color(n) }}>{entry.pet_names?.[n] ? `${entry.pet_names[n]} (${n})` : n}</span>)}
          </div>
        )}
        <div className="kr-entry__tools">
          <button className="btn btn--small btn--ghost" onClick={onEdit}>Redigera</button>
          <button className="btn btn--small btn--ghost" onClick={() => onMove(-1)} disabled={first} aria-label="Flytta upp">↑</button>
          <button className="btn btn--small btn--ghost" onClick={() => onMove(1)} disabled={last} aria-label="Flytta ner">↓</button>
          {url && !isCover && <button className="btn btn--small btn--ghost" onClick={onCover}>Gör till omslag</button>}
          <button className="btn btn--small btn--ghost btn--danger-text" onClick={onDelete}>Ta bort</button>
        </div>
      </div>
    </article>
  )
}

// ---------- Kapitelsidan ----------

type ChapterDraft = Pick<Chapter, 'title' | 'played_on' | 'zone' | 'subzone' | 'summary' | 'story'>

export function Kapitel() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [cast, setCast] = useState<CastMember[]>([])
  const [style, setStyle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploads, setUploads] = useState(0)
  const [dragging, setDragging] = useState(false)
  // Minnet som redigeras: 'ny' för ett osparat ögonblick
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<EntryDraft>(blankMoment)
  const [saving, setSaving] = useState(false)
  const [head, setHead] = useState<ChapterDraft | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!id) return
    const [c, e] = await Promise.all([
      supabase.from('chronicle_chapters').select('*').eq('id', id).maybeSingle(),
      supabase.from('chronicle_entries').select('*').eq('chapter_id', id),
    ])
    const err = c.error ?? e.error
    if (err) setError(err.message)
    else {
      setChapter(c.data as Chapter | null)
      setEntries(sortEntries(e.data as Entry[]))
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
    loadCastAndStyle().then(({ cast, style }) => { setCast(cast); setStyle(style) }).catch(() => {})
  }, [load])

  // Bilder som släpps eller klistras in: till minnet som redigeras, annars nya minnen
  const addImages = useCallback(async (files: File[]) => {
    if (!files.length || !id) return
    setError(null)
    if (editing) {
      setUploads((n) => n + 1)
      try {
        const { path, kind } = await storeImage(files[0])
        setDraft((d) => ({ ...d, image_path: path, kind: d.kind === 'serie' || d.kind === 'skarmdump' ? d.kind : kind }))
      } catch (e) {
        setError((e as Error).message)
      }
      setUploads((n) => n - 1)
      return
    }
    setUploads((n) => n + files.length)
    for (const f of files) {
      try {
        const { path, kind } = await storeImage(f)
        const { error } = await supabase.from('chronicle_entries').insert({ chapter_id: id, kind, image_path: path, position: Date.now() / 1000 })
        if (error) throw error
      } catch (e) {
        setError((e as Error).message)
      }
      setUploads((n) => n - 1)
    }
    await load()
  }, [editing, id, load])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = imageFiles(e.clipboardData?.items)
      if (files.length) {
        e.preventDefault()
        addImages(files)
      }
    }
    const onFile = (e: Event) => addImages([(e as CustomEvent<File>).detail])
    window.addEventListener('paste', onPaste)
    window.addEventListener('kr-file', onFile)
    return () => {
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('kr-file', onFile)
    }
  }, [addImages])

  if (missingTables(error ?? undefined)) {
    return <div className="page"><h1 className="page-title">Krönikan</h1><MissingSetup /></div>
  }
  if (!chapter) {
    return (
      <div className="page">
        <div className="panel empty">{loading ? 'Laddar…' : <>Kapitlet finns inte. <Link to="/kronikan">Till krönikan</Link></>}</div>
      </div>
    )
  }

  function startEdit(e: Entry | null) {
    if (editing === 'ny' && draft.image_path) deleteKronika(draft.image_path)
    setEditing(e ? e.id : 'ny')
    setDraft(e ? { kind: e.kind, image_path: e.image_path, caption: e.caption, quotes: e.quotes, cast_names: e.cast_names, pet_names: e.pet_names ?? {}, source_ids: e.source_ids ?? [], subzone: e.subzone, url: e.url } : blankMoment())
  }

  function cancelEdit() {
    const original = entries.find((e) => e.id === editing)
    // Bild som klistrats in men aldrig sparats
    if (draft.image_path && draft.image_path !== original?.image_path) deleteKronika(draft.image_path)
    setEditing(null)
  }

  async function saveEntry() {
    setSaving(true)
    setError(null)
    const pet_names = Object.fromEntries(
      Object.entries(draft.pet_names).map(([k, v]) => [k, v.trim()]).filter(([k, v]) => v && draft.cast_names.includes(k)),
    )
    const clean = { ...draft, pet_names, quotes: draft.quotes.filter((q) => q.text.trim()), caption: draft.caption?.trim() || null }
    const original = entries.find((e) => e.id === editing)
    const { error } = editing === 'ny'
      ? await supabase.from('chronicle_entries').insert({ ...clean, chapter_id: chapter!.id, position: Date.now() / 1000 })
      : await supabase.from('chronicle_entries').update(clean).eq('id', editing!)
    if (error) setError(error.message)
    else {
      if (original?.image_path && original.image_path !== clean.image_path) deleteKronika(original.image_path)
      setEditing(null)
      await load()
    }
    setSaving(false)
  }

  async function move(index: number, dir: -1 | 1) {
    const a = entries[index]
    const b = entries[index + dir]
    if (!b) return
    await Promise.all([
      supabase.from('chronicle_entries').update({ position: b.position }).eq('id', a.id),
      supabase.from('chronicle_entries').update({ position: a.position }).eq('id', b.id),
    ])
    await load()
  }

  async function remove(e: Entry) {
    if (!confirm(e.image_path ? 'Ta bort minnet och bilden?' : 'Ta bort minnet?')) return
    const { error } = await supabase.from('chronicle_entries').delete().eq('id', e.id)
    if (error) setError(error.message)
    else await deleteKronika(e.image_path)
    await load()
  }

  async function patchChapter(changes: Partial<Chapter>) {
    const { error } = await supabase.from('chronicle_chapters').update(changes).eq('id', chapter!.id)
    if (error) setError(error.message)
    await load()
    return !error
  }

  async function removeChapter() {
    if (!confirm(`Ta bort kapitlet "${chapter!.title}" med alla ${entries.length} minnen och bilder?`)) return
    const { error } = await supabase.from('chronicle_chapters').delete().eq('id', chapter!.id)
    if (error) return setError(error.message)
    await deleteKronika(...entries.map((e) => e.image_path))
    navigate('/kronikan')
  }

  // Senaste namnet per husdjur, så nästa ögonblick slipper skriva in det igen
  const petNames: Record<string, string> = Object.assign({}, ...entries.map((e) => e.pet_names ?? {}))

  const editorProps = {
    draft, onChange: setDraft, chapter, cast, petNames, style,
    sources: entries.filter((e) => draft.source_ids.includes(e.id)), uploading: uploads > 0, saving,
    onSave: saveEntry, onCancel: cancelEdit,
  }

  return (
    <div
      className={`page kr-page${dragging ? ' kr-page--drop' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false) }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        addImages(imageFiles(e.dataTransfer.files))
      }}
    >
      <Link to="/kronikan" className="back">← Krönikan</Link>

      {head ? (
        <form className="panel form" onSubmit={async (e) => {
          e.preventDefault()
          if (!head.title.trim()) return
          if (await patchChapter({ ...head, title: head.title.trim() })) setHead(null)
        }}>
          <label className="field field--wide"><span>Titel</span><input required value={head.title} onChange={(e) => setHead({ ...head, title: e.target.value })} /></label>
          <label className="field"><span>Spelkväll</span><input type="date" value={head.played_on} onChange={(e) => setHead({ ...head, played_on: e.target.value })} /></label>
          <label className="field"><span>Zon</span><input value={head.zone ?? ''} onChange={(e) => setHead({ ...head, zone: e.target.value || null })} /></label>
          <label className="field"><span>Delområde</span><input value={head.subzone ?? ''} onChange={(e) => setHead({ ...head, subzone: e.target.value || null })} /></label>
          <label className="field field--wide"><span>Sammanfattning</span><textarea rows={3} value={head.summary ?? ''} onChange={(e) => setHead({ ...head, summary: e.target.value || null })} placeholder="Kvällen i några meningar" /></label>
          <label className="field field--wide"><span>Berättelsen</span><textarea rows={12} value={head.story ?? ''} onChange={(e) => setHead({ ...head, story: e.target.value || null })} placeholder="Stycken separeras med en tom rad" /></label>
          <div className="actions field--wide">
            <button className="btn btn--primary">Spara</button>
            <button type="button" className="btn btn--ghost" onClick={() => setHead(null)}>Avbryt</button>
            <button type="button" className="btn btn--danger" onClick={removeChapter}>Ta bort kapitlet</button>
          </div>
        </form>
      ) : (
        <header className="kr-chapter-head">
          <div className="kr-timeline__date"><span>{weekday(chapter.played_on)}</span><b>{formatDay(chapter.played_on)}</b></div>
          <h1 className="page-title">{chapter.title}</h1>
          {chapter.zone && <div className="kr-plaque">{chapter.zone}{chapter.subzone && <small>{chapter.subzone}</small>}</div>}
          {chapter.summary && <p className="help-intro">{chapter.summary}</p>}
          <button className="btn btn--small btn--ghost" onClick={() => setHead({ title: chapter.title, played_on: chapter.played_on, zone: chapter.zone, subzone: chapter.subzone, summary: chapter.summary, story: chapter.story })}>
            Redigera kapitlet
          </button>
        </header>
      )}

      {chapter.story && !head && (
        <article className="panel kr-story">
          <h2 className="panel-title">Berättelsen</h2>
          {/* Krönikörens hänvisningar som (#3) behövs inte i läsvyn */}
          {chapter.story.split(/\n\s*\n/).map((p, i) => <p key={i}>{p.replace(/\s*\(#[\d,\s#–-]+\)/g, '')}</p>)}
        </article>
      )}

      {error && <div className="alert">{error}</div>}

      <div className="kr-add">
        <div className="dropzone kr-drop" onClick={() => fileInput.current?.click()} role="button" tabIndex={0}>
          <div className="dropzone__big">Släng in bilder: <kbd>Ctrl</kbd>+<kbd>V</kbd> eller dra hit</div>
          <div>Flera på en gång går bra. Seriebilder och skärmdumpar känns igen på formatet.</div>
          {uploads > 0 && !editing && <p className="pulse">Laddar upp {uploads}…</p>}
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => {
            addImages(imageFiles(e.target.files))
            e.target.value = ''
          }} />
        </div>
        <div className="kr-add__buttons">
          <button className="btn btn--primary" onClick={() => startEdit(null)} disabled={editing === 'ny'}>+ Nytt ögonblick</button>
          <small className="note">Beskriv en scen, få en färdig prompt till ChatGPT och klistra in bilden när den är klar.</small>
        </div>
      </div>

      <Kronikoren chapter={chapter} entries={entries} cast={cast} onChanged={load} />

      {editing === 'ny' && (
        <div className="panel">
          <h2 className="panel-title">Nytt ögonblick</h2>
          <EntryEditor {...editorProps} isNew />
        </div>
      )}

      {entries.length === 0 && editing !== 'ny' ? (
        <div className="panel empty">Inga minnen än.</div>
      ) : (
        <div className="kr-entries">
          {entries.map((e, i) =>
            editing === e.id ? (
              <div key={e.id} className="panel kr-entry--editing">
                <EntryEditor {...editorProps} isNew={false} />
              </div>
            ) : (
              <EntryView
                key={e.id}
                entry={e}
                chapter={chapter}
                cast={cast}
                isCover={chapter.cover_id === e.id}
                first={i === 0}
                last={i === entries.length - 1}
                onEdit={() => startEdit(e)}
                onMove={(dir) => move(i, dir)}
                onCover={() => patchChapter({ cover_id: e.id })}
                onDelete={() => remove(e)}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}
