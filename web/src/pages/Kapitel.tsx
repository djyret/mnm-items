import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  KINDS, VISIBILITIES, buildPrompt, foldSources, generateImage, deleteKronika, formatDay, imageFiles, kronikaUrl, loadCastAndStyle,
  missingTables, shotTime, sortEntries, storeImage, weekday, withParts,
} from '../lib/kronikan'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import type { CastMember, Chapter, Entry, Quote, Visibility } from '../lib/types'
import { ChapterTabs } from '../components/ChapterTabs'
import { Icon } from '../components/Icon'
import { Kronikoren, Sagoskrivaren } from '../components/Kronikoren'
import { MissingSetup } from './Kronikan'

type EntryDraft = Pick<Entry, 'kind' | 'image_path' | 'caption' | 'quotes' | 'cast_names' | 'pet_names' | 'source_ids' | 'subzone' | 'url' | 'width' | 'height'>

const blankMoment = (): EntryDraft => ({
  kind: 'serie', image_path: null, caption: null, quotes: [], cast_names: [], pet_names: {}, source_ids: [], subzone: null, url: null, width: null, height: null,
})

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

// ---------- Bildprompt ----------

function PromptBox({ prompt, people, sources, onGenerate, generating, hasImage }: {
  prompt: string
  people: CastMember[]
  sources: Entry[]
  onGenerate: () => void
  generating: boolean
  hasImage: boolean
}) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const refs = people.filter((c) => c.ref_path)
  const missing = people.filter((c) => !c.ref_path)
  return (
    <div className="kr-prompt">
      <div className="loan__outhead">
        <span className="guide__label">{t('kronikan.prompt.label')}</span>
        <span className="kr-prompt__actions">
        <button
          type="button"
          className="btn btn--small btn--primary"
          onClick={onGenerate}
          disabled={generating}
          title={t('kronikan.prompt.paintTitle')}
        >
          {generating ? t('kronikan.prompt.painting') : hasImage ? t('kronikan.prompt.repaint') : t('kronikan.prompt.paint')}
        </button>
        <button
          type="button"
          className="btn btn--small"
          onClick={async () => {
            await navigator.clipboard.writeText(prompt)
            setCopied(true)
            setTimeout(() => setCopied(false), 1600)
          }}
        >
          {copied ? t('kronikan.prompt.copied') : t('kronikan.prompt.copy')}
        </button>
        </span>
      </div>
      <textarea readOnly rows={10} value={prompt} onFocus={(e) => e.target.select()} />
      {sources.some((e) => e.image_path) && (
        <div className="kr-prompt__refs">
          <span className="chips__label">{t('kronikan.prompt.shots')}</span>
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
          <span className="chips__label">{t('kronikan.prompt.refs')}</span>
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
              {withParts(t('kronikan.prompt.missingRefs', { names: missing.map((c) => c.name).join(', ') }), {
                link: <Link to="/kronikan/stil">{t('kronikan.prompt.styleBibleLink')}</Link>,
              })}
            </small>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Redigera ett minne ----------

function EntryEditor({ draft, onChange, chapter, cast, petNames, sources, style, uploading, onGenerate, generating }: {
  draft: EntryDraft
  onChange: (d: EntryDraft) => void
  chapter: Chapter
  cast: CastMember[]
  /** Senast använda namn per husdjur i kapitlet */
  petNames: Record<string, string>
  sources: Entry[]
  style: string
  uploading: boolean
  onGenerate: (prompt: string) => void
  generating: boolean
}) {
  const { t, lang } = useI18n()
  const set = <K extends keyof EntryDraft>(k: K, v: EntryDraft[K]) => onChange({ ...draft, [k]: v })
  const setQuote = (i: number, q: Partial<Quote>) => set('quotes', draft.quotes.map((x, j) => (j === i ? { ...x, ...q } : x)))
  const fileInput = useRef<HTMLInputElement>(null)
  const people = draft.cast_names.map((n) => cast.find((c) => c.name === n)).filter((c): c is CastMember => !!c)
  const hasImage = draft.kind === 'serie' || draft.kind === 'skarmdump'

  return (
    <div className="kr-editor">
      <div className="field">
        <span>{t('kronikan.editor.kind')}</span>
        <div className="chips">
          {KINDS.map((k) => (
            <button key={k} type="button" className={`chip${draft.kind === k ? ' is-active' : ''}`} onClick={() => set('kind', k)}>
              {t(`kronikan.kind.${k}`)}
            </button>
          ))}
        </div>
      </div>

      {hasImage && (
        <div className={`kr-editor__image${draft.image_path ? '' : ' kr-editor__image--empty'}`} onClick={() => fileInput.current?.click()} role="button" tabIndex={0}>
          {uploading || generating ? (
            <span className="pulse">{generating ? t('kronikan.editor.painting') : t('kronikan.editor.uploading')}</span>
          ) : draft.image_path ? (
            <img src={kronikaUrl(draft.image_path)!} alt="" />
          ) : (
            <span>
              {withParts(t(draft.kind === 'serie' ? 'kronikan.editor.pasteComic' : 'kronikan.editor.pasteShot'), { keys: <><kbd>Ctrl</kbd>+<kbd>V</kbd></> })}
              <small>{t('kronikan.editor.orPick')}</small>
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
        <span>{draft.kind === 'serie' ? t('kronikan.editor.whatInPicture') : t('kronikan.editor.whatHappened')}</span>
        <textarea rows={3} value={draft.caption ?? ''} onChange={(e) => set('caption', e.target.value || null)}
          placeholder={draft.kind === 'serie' ? t('kronikan.editor.captionPlaceholder') : ''} />
      </label>

      {draft.kind === 'klipp' && (
        <label className="field"><span>{t('kronikan.editor.clipLink')}</span><input value={draft.url ?? ''} onChange={(e) => set('url', e.target.value || null)} placeholder="YouTube, Medal, Twitch …" /></label>
      )}

      <div className="field">
        <span>{t('kronikan.editor.inPicture')}</span>
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
          <span>{t('kronikan.editor.petName', { name: c.name })}</span>
          <input value={draft.pet_names[c.name] ?? ''} placeholder={t('kronikan.editor.petPlaceholder')}
            onChange={(e) => set('pet_names', { ...draft.pet_names, [c.name]: e.target.value })} />
        </label>
      ))}

      <div className="field">
        <span>{t('kronikan.editor.quotes')}</span>
        {draft.quotes.map((q, i) => (
          <div key={i} className="quick__row kr-quote">
            <select value={q.who} onChange={(e) => setQuote(i, { who: e.target.value })}>
              <option value="">{t('kronikan.editor.narrator')}</option>
              {cast.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <input value={q.text} onChange={(e) => setQuote(i, { text: e.target.value })} placeholder={t('kronikan.editor.quotePlaceholder')} />
            <button type="button" className="icon-btn" aria-label={t('kronikan.editor.removeQuote')} onClick={() => set('quotes', draft.quotes.filter((_, j) => j !== i))}><Icon name="stang" size={16} /></button>
          </div>
        ))}
        <div className="chips chips--add">
          <button type="button" className="chip" onClick={() => set('quotes', [...draft.quotes, { who: draft.cast_names[0] ?? '', text: '' }])}><Icon name="plus" size={14} /> {t('kronikan.editor.addQuote')}</button>
        </div>
      </div>

      {draft.kind !== 'anteckning' && draft.kind !== 'klipp' && (
        <label className="field">
          <span>{t('kronikan.editor.subzone')}</span>
          <input value={draft.subzone ?? ''} onChange={(e) => set('subzone', e.target.value || null)} placeholder={chapter.subzone ?? t('kronikan.editor.subzonePlaceholder')} />
        </label>
      )}

      {draft.kind === 'serie' && (() => {
        const prompt = buildPrompt(style, chapter, draft, cast, lang)
        return <PromptBox prompt={prompt} people={people} sources={sources} onGenerate={() => onGenerate(prompt)} generating={generating} hasImage={!!draft.image_path} />
      })()}

    </div>
  )
}

// ---------- En rad i kvällens lista ----------

function EntryRow({ entry, index, selected, isCover, cast, originals, onSelect }: {
  entry: Entry
  /** Skärmdumpar som seriebilden gjorts av */
  originals: Entry[]
  index: number
  selected: boolean
  isCover: boolean
  cast: CastMember[]
  onSelect: () => void
}) {
  const { t } = useI18n()
  const url = kronikaUrl(entry.image_path)
  const color = (name: string) => cast.find((c) => c.name === name)?.tag_color
  const waiting = entry.kind === 'serie' && !url
  return (
    <li>
      <button type="button" className={`kr-row${selected ? ' is-selected' : ''}`} aria-current={selected || undefined} onClick={onSelect}>
        <span className="kr-row__nr">{index + 1}</span>
        <span className={`kr-row__thumb${waiting && !originals[0] ? ' kr-row__thumb--wait' : ''}`}>
          {url ? <img src={url} alt="" loading="lazy" />
            : waiting && originals[0] ? <><img src={kronikaUrl(originals[0].image_path)!} alt="" loading="lazy" /><span className="kr-row__waiting">{t('kronikan.row.waitingComic')}</span></>
            : waiting ? <span>{t('kronikan.row.waitingImage')}</span>
            : <Icon name={entry.kind === 'klipp' ? 'spela' : 'plus'} size={18} />}
          {url && originals[0] && <img className="kr-row__original" src={kronikaUrl(originals[0].image_path)!} alt={t('kronikan.row.original')} loading="lazy" />}
        </span>
        <span className="kr-row__body">
          <span className="kr-row__meta">
            <span className={`badge kr-kind kr-kind--${entry.kind}`}>{t(`kronikan.kind.${entry.kind}`)}</span>
            {isCover && <span className="badge badge--main">{t('kronikan.row.cover')}</span>}
          </span>
          <span className={`kr-row__caption${entry.caption ? '' : ' is-empty'}`}>
            {entry.caption ?? (entry.quotes[0] ? `”${entry.quotes[0].text}”` : t('kronikan.row.noCaption'))}
          </span>
          {entry.cast_names.length > 0 && (
            <span className="kr-cast">
              {entry.cast_names.map((n) => <span key={n} style={{ color: color(n) }}>{entry.pet_names?.[n] ? `${entry.pet_names[n]} (${n})` : n}</span>)}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}

// ---------- Kapitelsidan ----------

type ChapterDraft = Pick<Chapter, 'title' | 'played_on' | 'zone' | 'subzone' | 'summary' | 'story' | 'saga'>

export function Kapitel() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
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
  const [snapshot, setSnapshot] = useState<EntryDraft>(blankMoment)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
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
    if (editing && (editing === 'ny' || !draft.image_path)) {
      setUploads((n) => n + 1)
      try {
        const { path, kind, width, height } = await storeImage(files[0])
        setDraft((d) => ({ ...d, image_path: path, width, height, kind: d.kind === 'serie' || d.kind === 'skarmdump' ? d.kind : kind }))
      } catch (e) {
        setError((e as Error).message)
      }
      setUploads((n) => n - 1)
      return
    }
    setUploads((n) => n + files.length)
    // Äldst först, så skärmdumpar från en spelkväll hamnar i den ordning de togs
    for (const f of [...files].sort((a, b) => shotTime(a) - shotTime(b))) {
      try {
        const { path, kind, width, height } = await storeImage(f)
        const { error } = await supabase.from('chronicle_entries').insert({ chapter_id: id, kind, image_path: path, width, height, position: Date.now() / 1000 })
        if (error) throw error
      } catch (e) {
        setError((e as Error).message)
      }
      setUploads((n) => n - 1)
    }
    await load()
  }, [editing, draft.image_path, id, load])

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
    return <div className="page"><h1 className="page-title">{t('kronikan.title')}</h1><MissingSetup /></div>
  }
  if (!chapter) {
    return (
      <div className="page">
        <div className="panel empty">{loading ? t('common.loading') : <>{t('kronikan.workshop.notFound')} <Link to="/kronikan">{t('kronikan.toChronicle')}</Link></>}</div>
      </div>
    )
  }

  function startEdit(e: Entry | null) {
    if (editing === 'ny' && draft.image_path) deleteKronika(draft.image_path)
    setEditing(e ? e.id : 'ny')
    const d = e ? { kind: e.kind, image_path: e.image_path, caption: e.caption, quotes: e.quotes, cast_names: e.cast_names, pet_names: e.pet_names ?? {}, source_ids: e.source_ids ?? [], subzone: e.subzone, url: e.url, width: e.width, height: e.height } : blankMoment()
    setDraft(d)
    setSnapshot(d)
  }

  /** Nytt ögonblick med skärmdumpen som underlag; beskrivning och rollista följer med. */
  function startComic(e: Entry) {
    if (editing === 'ny' && draft.image_path) deleteKronika(draft.image_path)
    setEditing('ny')
    const d = {
      ...blankMoment(),
      caption: e.caption,
      cast_names: e.cast_names,
      pet_names: e.pet_names ?? {},
      quotes: e.quotes,
      subzone: e.subzone,
      source_ids: [e.id],
    }
    setDraft(d)
    setSnapshot(d)
  }

  function cancelEdit() {
    const original = entries.find((e) => e.id === editing)
    // Bild som klistrats in men aldrig sparats
    if (draft.image_path && draft.image_path !== original?.image_path) deleteKronika(draft.image_path)
    setEditing(null)
  }

  /** Ett ögonblick som bygger på skärmdumpar hamnar direkt efter den sista av dem. */
  function positionAfter(sourceIds: string[]): number {
    const after = entries.filter((e) => sourceIds.includes(e.id)).map((e) => e.position)
    if (!after.length) return Date.now() / 1000
    const last = Math.max(...after)
    const next = entries.map((e) => e.position).filter((p) => p > last)
    return next.length ? (last + Math.min(...next)) / 2 : last + 1
  }

  async function saveEntry() {
    setSaving(true)
    setError(null)
    const pet_names = Object.fromEntries(
      Object.entries(draft.pet_names).map(([k, v]) => [k, v.trim()]).filter(([k, v]) => v && draft.cast_names.includes(k)),
    )
    const clean = { ...draft, pet_names, quotes: draft.quotes.filter((q) => q.text.trim()), caption: draft.caption?.trim() || null }
    const original = entries.find((e) => e.id === editing)
    const { data, error } = editing === 'ny'
      ? await supabase.from('chronicle_entries').insert({ ...clean, chapter_id: chapter!.id, position: positionAfter(clean.source_ids) }).select('id').single()
      : await supabase.from('chronicle_entries').update(clean).eq('id', editing!).select('id').single()
    if (error) setError(error.message)
    else {
      if (original?.image_path && original.image_path !== clean.image_path) deleteKronika(original.image_path)
      // Minnet förblir valt i panelen; ett nytt ögonblick blir valt
      setEditing(data.id)
      setDraft(clean)
      setSnapshot(clean)
      await load()
    }
    setSaving(false)
  }

  /** Målar bilden och lägger den i utkastet; den kopplas till minnet först när man sparar. */
  async function generate(prompt: string) {
    setGenerating(true)
    setError(null)
    try {
      const img = await generateImage(prompt, draft.cast_names, draft.source_ids)
      const original = entries.find((e) => e.id === editing)
      // En tidigare osparad bild i utkastet behövs inte längre
      if (draft.image_path && draft.image_path !== original?.image_path) deleteKronika(draft.image_path)
      setDraft((d) => ({ ...d, image_path: img.path, width: img.width, height: img.height }))
    } catch (e) {
      setError((e as Error).message)
    }
    setGenerating(false)
  }

  async function move(index: number, dir: -1 | 1) {
    const a = visible[index]
    const b = visible[index + dir]
    if (!b) return
    await Promise.all([
      supabase.from('chronicle_entries').update({ position: b.position }).eq('id', a.id),
      supabase.from('chronicle_entries').update({ position: a.position }).eq('id', b.id),
    ])
    await load()
  }

  async function remove(e: Entry): Promise<boolean> {
    if (!confirm(e.image_path ? t('kronikan.workshop.confirmRemoveWithImage') : t('kronikan.workshop.confirmRemove'))) return false
    const { error } = await supabase.from('chronicle_entries').delete().eq('id', e.id)
    if (error) setError(error.message)
    else await deleteKronika(e.image_path)
    await load()
    return !error
  }

  async function patchChapter(changes: Partial<Chapter>) {
    const { error } = await supabase.from('chronicle_chapters').update(changes).eq('id', chapter!.id)
    if (error) setError(error.message)
    await load()
    return !error
  }

  async function removeChapter() {
    if (!confirm(t('kronikan.workshop.confirmRemoveChapter', { title: chapter!.title, n: entries.length }))) return
    const { error } = await supabase.from('chronicle_chapters').delete().eq('id', chapter!.id)
    if (error) return setError(error.message)
    await deleteKronika(...entries.map((e) => e.image_path))
    navigate('/kronikan')
  }

  // Senaste namnet per husdjur, så nästa ögonblick slipper skriva in det igen
  const petNames: Record<string, string> = Object.assign({}, ...entries.map((e) => e.pet_names ?? {}))
  // Skärmdumpar som en seriebild gjorts av visas inuti seriebilden, inte som egna minnen
  const { visible, originals } = foldSources(entries, { pending: true })

  const editorProps = {
    draft, onChange: setDraft, chapter, cast, petNames, style,
    sources: entries.filter((e) => draft.source_ids.includes(e.id)), uploading: uploads > 0,
    onGenerate: generate, generating,
  }

  const index = visible.findIndex((e) => e.id === editing)
  const selected = index >= 0 ? visible[index] : null
  const waiting = visible.filter((e) => e.kind === 'serie' && !e.image_path).length
  const selectedOriginals = selected ? originals.get(selected.id) ?? [] : []

  /** Skärmdumpen blir ett eget minne igen (seriebilden slutar bygga på den). */
  async function unfold(shot: Entry) {
    if (!selected) return
    const source_ids = (selected.source_ids ?? []).filter((x) => x !== shot.id)
    const { error } = await supabase.from('chronicle_entries').update({ source_ids }).eq('id', selected.id)
    if (error) return setError(error.message)
    setDraft((d) => ({ ...d, source_ids }))
    setSnapshot((d) => ({ ...d, source_ids }))
    await load()
  }
  const dirty = editing !== null && JSON.stringify(draft) !== JSON.stringify(snapshot)

  /** Byt valt minne; osparade ändringar slängs bara efter en fråga. */
  function select(e: Entry | null, how: 'edit' | 'comic' | 'new' = 'edit') {
    if (dirty && !confirm(t('kronikan.workshop.confirmDiscard'))) return
    if (editing) cancelEdit()
    if (how === 'comic' && e) startComic(e)
    else if (how === 'new') startEdit(null)
    else if (e) startEdit(e)
    // Visa panelen: på mobil ligger den överst, på datorn ska den fastna så Spara syns
    setTimeout(() => {
      const panel = document.querySelector('.kr-bench__panel')
      if (!panel) return
      if (window.matchMedia('(max-width: 900px)').matches) panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else {
        const top = panel.getBoundingClientRect().top
        if (top > 16) window.scrollBy({ top: top - 16, behavior: 'smooth' })
      }
    }, 50)
  }

  const kindTitle = editing === 'ny'
    ? (draft.source_ids.length ? t('kronikan.workshop.newComicFromShot') : t('kronikan.workshop.newMoment'))
    : t('kronikan.workshop.position', { kind: t(`kronikan.kind.${draft.kind}`), n: index + 1, total: visible.length })

  return (
    <div
      className={`page kr-page kr-work${dragging ? ' kr-page--drop' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false) }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        addImages(imageFiles(e.dataTransfer.files))
      }}
    >
      <div className="kr-read__top">
        <Link to="/kronikan" className="back"><Icon name="vanster" size={14} /> {t('kronikan.title')}</Link>
        <ChapterTabs id={chapter.id} />
      </div>

      {error && <div className="alert">{error}</div>}

      <div className={`kr-bench${editing ? ' is-editing' : ''}`}>
        {/* Kvällens minnen i ordning: välj ett för att arbeta med det i panelen */}
        <section className="kr-bench__list" aria-label={t('kronikan.workshop.listLabel')}>
          <header className="kr-bench__head">
            <h1 className="page-title">
              {chapter.title}
              {chapter.visibility !== 'public' && <span className={`kr-vis kr-vis--${chapter.visibility}`}>{t(`kronikan.visibility.${chapter.visibility}`)}</span>}
            </h1>
            <span className="kr-zone">{[`${weekday(chapter.played_on)} ${formatDay(chapter.played_on)}`, chapter.zone, chapter.subzone].filter(Boolean).join(' · ')}</span>
            <span className="kr-bench__count">
              {t(visible.length === 1 ? 'kronikan.memoryOne' : 'kronikan.memories', { n: visible.length })}{waiting > 0 && <> · <b>{t('kronikan.workshop.waiting', { n: waiting })}</b></>}
              {uploads > 0 && <span className="pulse"> · {t('kronikan.workshop.uploadingN', { n: uploads })}</span>}
            </span>
          </header>
          {visible.length === 0 ? (
            <div className="kr-bench__empty">
              {withParts(t('kronikan.workshop.empty'), { keys: <><kbd>Ctrl</kbd>+<kbd>V</kbd></> })}
            </div>
          ) : (
            <ol className="kr-rows">
              {visible.map((e, i) => (
                <EntryRow key={e.id} entry={e} index={i} cast={cast} isCover={chapter.cover_id === e.id} originals={originals.get(e.id) ?? []}
                  selected={editing === e.id} onSelect={() => (editing === e.id ? undefined : select(e))} />
              ))}
            </ol>
          )}
        </section>

        {/* Samlad kontrollpanel: kapitlet när inget är valt, annars det valda minnet */}
        <aside className="kr-bench__panel" aria-label={editing ? kindTitle : t('kronikan.chapter')}>
          {editing ? (
            <div className="kr-inspector">
              <div className="kr-inspector__head">
                <button type="button" className="btn btn--small btn--ghost" onClick={() => select(null)} disabled={saving}>
                  <Icon name="vanster" size={14} /> {t('kronikan.chapter')}
                </button>
                <h2 className="panel-title">{kindTitle}</h2>
                {selected && (
                  <span className="kr-inspector__nav">
                    <button type="button" className="btn btn--small btn--ghost" aria-label={t('kronikan.workshop.prev')} title={t('kronikan.workshop.prev')} disabled={index === 0} onClick={() => select(visible[index - 1])}><Icon name="upp" size={16} /></button>
                    <button type="button" className="btn btn--small btn--ghost" aria-label={t('kronikan.workshop.next')} title={t('kronikan.workshop.next')} disabled={index === visible.length - 1} onClick={() => select(visible[index + 1])}><Icon name="ner" size={16} /></button>
                  </span>
                )}
              </div>

              {selected && (
                <div className="kr-inspector__tools">
                  {selected.kind === 'skarmdump' && selected.image_path && (
                    <button type="button" className="btn btn--small" onClick={() => select(selected, 'comic')}>{t('kronikan.workshop.makeComic')}</button>
                  )}
                  <button type="button" className="btn btn--small btn--ghost" disabled={index === 0} onClick={() => move(index, -1)}><Icon name="upp" size={14} /> {t('kronikan.workshop.moveUp')}</button>
                  <button type="button" className="btn btn--small btn--ghost" disabled={index === visible.length - 1} onClick={() => move(index, 1)}><Icon name="ner" size={14} /> {t('kronikan.workshop.moveDown')}</button>
                  {selected.image_path && chapter.cover_id !== selected.id && (
                    <button type="button" className="btn btn--small btn--ghost" onClick={() => patchChapter({ cover_id: selected.id })}>{t('kronikan.workshop.makeCover')}</button>
                  )}
                </div>
              )}

              {selectedOriginals.length > 0 && (
                <div className="kr-originals">
                  <span className="chips__label">{t('kronikan.workshop.basedOn')}</span>
                  {selectedOriginals.map((o) => (
                    <div key={o.id} className="kr-originals__item">
                      <img src={kronikaUrl(o.image_path)!} alt={o.caption ?? t('kronikan.kind.skarmdump')} />
                      <button type="button" className="btn btn--small btn--ghost" onClick={() => unfold(o)}>{t('kronikan.workshop.unfold')}</button>
                    </div>
                  ))}
                </div>
              )}

              <EntryEditor {...editorProps} />

              <div className="kr-inspector__foot">
                <button className="btn btn--primary" onClick={saveEntry} disabled={saving || uploads > 0 || generating || (!dirty && editing !== 'ny')}>
                  {saving ? t('kronikan.workshop.saving') : editing === 'ny' ? t('kronikan.workshop.saveMemory') : dirty ? t('common.save') : t('kronikan.workshop.saved')}
                </button>
                <button className="btn btn--ghost" onClick={() => select(null)} disabled={saving}>{dirty ? t('common.cancel') : t('kronikan.close')}</button>
                {selected && (
                  <button type="button" className="btn btn--small btn--ghost btn--danger-text kr-inspector__delete" disabled={saving}
                    onClick={async () => { if (await remove(selected)) setEditing(null) }}>{t('common.delete')}</button>
                )}
              </div>
            </div>
          ) : head ? (
            <form className="kr-panel-form" onSubmit={async (e) => {
              e.preventDefault()
              if (!head.title.trim()) return
              if (await patchChapter({ ...head, title: head.title.trim() })) setHead(null)
            }}>
              <h2 className="panel-title">{t('kronikan.workshop.editChapter')}</h2>
              <label className="field"><span>{t('kronikan.field.title')}</span><input required value={head.title} onChange={(e) => setHead({ ...head, title: e.target.value })} /></label>
              <div className="form">
                <label className="field"><span>{t('kronikan.field.playedOn')}</span><input type="date" value={head.played_on} onChange={(e) => setHead({ ...head, played_on: e.target.value })} /></label>
                <label className="field"><span>{t('kronikan.field.zone')}</span><input value={head.zone ?? ''} onChange={(e) => setHead({ ...head, zone: e.target.value || null })} /></label>
                <label className="field"><span>{t('kronikan.field.subzone')}</span><input value={head.subzone ?? ''} onChange={(e) => setHead({ ...head, subzone: e.target.value || null })} /></label>
              </div>
              <label className="field"><span>{t('kronikan.field.summary')}</span><textarea rows={3} value={head.summary ?? ''} onChange={(e) => setHead({ ...head, summary: e.target.value || null })} placeholder={t('kronikan.workshop.summaryPlaceholder')} /></label>
              <label className="field"><span>{t('kronikan.field.story')}</span><textarea rows={10} value={head.story ?? ''} onChange={(e) => setHead({ ...head, story: e.target.value || null })} placeholder={t('kronikan.workshop.storyPlaceholder')} /></label>
              <label className="field"><span>{t('kronikan.field.saga')}</span><textarea rows={14} value={head.saga ?? ''} onChange={(e) => setHead({ ...head, saga: e.target.value || null })} placeholder={t('kronikan.workshop.sagaPlaceholder')} /></label>
              <div className="actions">
                <button className="btn btn--primary">{t('common.save')}</button>
                <button type="button" className="btn btn--ghost" onClick={() => setHead(null)}>{t('common.cancel')}</button>
                <button type="button" className="btn btn--danger" onClick={removeChapter}>{t('kronikan.workshop.removeChapter')}</button>
              </div>
            </form>
          ) : (
            <div className="kr-chapter-panel">
              <section className="kr-panel-section">
                <h2 className="panel-title">{t('kronikan.workshop.add')}</h2>
                <div className="dropzone kr-drop" onClick={() => fileInput.current?.click()} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.current?.click() } }}>
                  <b>{t('kronikan.workshop.pasteImages')}</b>
                  <span>{withParts(t('kronikan.workshop.pasteHint'), { keys: <><kbd>Ctrl</kbd>+<kbd>V</kbd></> })}</span>
                  <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => {
                    addImages(imageFiles(e.target.files))
                    e.target.value = ''
                  }} />
                </div>
                <button className="btn" onClick={() => select(null, 'new')} title={t('kronikan.workshop.newMomentTitle')}>
                  <Icon name="plus" size={16} /> {t('kronikan.workshop.newMoment')}
                </button>
              </section>

              <section className="kr-panel-section">
                <Kronikoren chapter={chapter} entries={entries} cast={cast} onChanged={load} bare />
              </section>

              <section className="kr-panel-section">
                <Sagoskrivaren chapter={chapter} onChanged={load} />
              </section>

              <section className="kr-panel-section kr-panel-section--quiet">
                <h2 className="panel-title">{t('kronikan.chapter')}</h2>
                <label className="field">
                  <span>{t('kronikan.workshop.whoMayRead')}</span>
                  <select value={chapter.visibility} onChange={(e) => patchChapter({ visibility: e.target.value as Visibility })}>
                    {VISIBILITIES.map((v) => <option key={v} value={v}>{t(`kronikan.visibility.${v}`)}</option>)}
                  </select>
                  <small>{t(`kronikan.visibilityHint.${chapter.visibility}`)}</small>
                </label>
                <div className="actions">
                  <button className="btn btn--small btn--ghost" onClick={() => setHead({ title: chapter.title, played_on: chapter.played_on, zone: chapter.zone, subzone: chapter.subzone, summary: chapter.summary, story: chapter.story, saga: chapter.saga })}>
                    {t('kronikan.workshop.editChapter')}
                  </button>
                  <Link className="btn btn--small btn--ghost" to={`/kronikan/${chapter.id}`}>{t('kronikan.workshop.readChapter')}</Link>
                </div>
                <p className="note">{t('kronikan.workshop.pickHint')}</p>
              </section>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
