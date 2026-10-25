import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROLE_LABELS, deleteKronika, imageFiles, kronikaUrl, loadCastAndStyle, missingTables, storeImage } from '../lib/kronikan'
import { supabase } from '../lib/supabase'
import type { CastMember } from '../lib/types'
import { MissingSetup } from './Kronikan'

type CastDraft = Pick<CastMember, 'name' | 'role' | 'tag_color' | 'look' | 'ref_path'>

const blank: CastDraft = { name: '', role: 'hjalte', tag_color: '#8fc8ff', look: '', ref_path: null }

function CastForm({ initial, onSave, onCancel }: {
  initial: CastDraft
  onSave: (d: CastDraft) => Promise<void>
  onCancel: () => void
}) {
  const [d, setD] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const set = <K extends keyof CastDraft>(k: K, v: CastDraft[K]) => setD((x) => ({ ...x, [k]: v }))

  async function setImage(files: File[]) {
    if (!files[0]) return
    setUploading(true)
    const { path } = await storeImage(files[0])
    // Ersatt bild som inte sparats än tas bort direkt
    if (d.ref_path && d.ref_path !== initial.ref_path) deleteKronika(d.ref_path)
    set('ref_path', path)
    setUploading(false)
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = imageFiles(e.clipboardData?.items)
      if (files.length) {
        e.preventDefault()
        setImage(files)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  return (
    <form
      className="form kr-cast-form"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!d.name.trim()) return
        setBusy(true)
        await onSave({ ...d, name: d.name.trim(), look: d.look.trim() })
        setBusy(false)
      }}
    >
      <div
        className={`kr-ref field--narrow${d.ref_path ? '' : ' kr-ref--empty'}`}
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); setImage(imageFiles(e.dataTransfer.files)) }}
        role="button"
        tabIndex={0}
      >
        {uploading ? <span className="pulse">…</span> : d.ref_path ? <img src={kronikaUrl(d.ref_path)!} alt="" /> : <span>Referensbild: <kbd>Ctrl</kbd>+<kbd>V</kbd> eller klicka</span>}
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => setImage(imageFiles(e.target.files))} />
      </div>
      <div className="kr-cast-form__fields">
        <div className="form">
          <label className="field"><span>Namn</span><input required value={d.name} onChange={(e) => set('name', e.target.value)} /></label>
          <label className="field field--narrow"><span>Namnfärg</span><input type="color" value={d.tag_color} onChange={(e) => set('tag_color', e.target.value)} /></label>
        </div>
        <div className="chips">
          {(Object.keys(ROLE_LABELS) as CastMember['role'][]).map((r) => (
            <button key={r} type="button" className={`chip${d.role === r ? ' is-active' : ''}`} onClick={() => set('role', r)}>{ROLE_LABELS[r]}</button>
          ))}
        </div>
        <label className="field">
          <span>Utseende (engelska fungerar bäst i bildprompten)</span>
          <textarea rows={4} value={d.look} onChange={(e) => set('look', e.target.value)} placeholder="Ras, klass, ansikte, hår, kläder, vapen, magifärg …" />
        </label>
        <div className="actions">
          <button className="btn btn--primary" disabled={busy || uploading}>Spara</button>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>Avbryt</button>
        </div>
      </div>
    </form>
  )
}

export function Stilbibel() {
  const [cast, setCast] = useState<CastMember[]>([])
  const [style, setStyle] = useState('')
  const [savedStyle, setSavedStyle] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const r = await loadCastAndStyle()
      setCast(r.cast)
      setStyle(r.style)
      setSavedStyle(r.style)
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function saveStyle() {
    const { error } = await supabase.from('chronicle_settings').upsert({ key: 'stil', value: style })
    if (error) setError(error.message)
    else setSavedStyle(style)
  }

  async function saveCast(id: string | null, d: CastDraft) {
    setError(null)
    const old = cast.find((c) => c.id === id)
    const { error } = id
      ? await supabase.from('chronicle_cast').update(d).eq('id', id)
      : await supabase.from('chronicle_cast').insert({ ...d, position: cast.length + 1 })
    if (error) {
      setError(error.code === '23505' ? `${d.name} finns redan i rollistan.` : error.message)
      return
    }
    if (old?.ref_path && old.ref_path !== d.ref_path) deleteKronika(old.ref_path)
    setEditing(null)
    await load()
  }

  async function removeCast(c: CastMember) {
    if (!confirm(`Ta bort ${c.name} ur rollistan?`)) return
    const { error } = await supabase.from('chronicle_cast').delete().eq('id', c.id)
    if (error) return setError(error.message)
    await deleteKronika(c.ref_path)
    await load()
  }

  if (missingTables(error ?? undefined)) {
    return <div className="page"><h1 className="page-title">Stilbibel</h1><MissingSetup /></div>
  }

  return (
    <div className="page">
      <Link to="/kronikan" className="back">← Krönikan</Link>
      <h1 className="page-title">Stilbibel</h1>
      <p className="help-intro">
        Det här håller seriebilderna lika från gång till gång. Varje bildprompt byggs av stilen nedan plus
        utseendet på dem som är med i scenen. Lägg referensbilder på alla – ChatGPT följer en bild bättre än en beskrivning.
      </p>
      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <h2 className="panel-title">Stil</h2>
        <textarea className="kr-style" rows={9} value={style} onChange={(e) => setStyle(e.target.value)} disabled={loading} />
        <div className="actions">
          <button className="btn btn--primary" onClick={saveStyle} disabled={style === savedStyle}>Spara stilen</button>
          {style !== savedStyle && <button className="btn btn--ghost" onClick={() => setStyle(savedStyle)}>Ångra</button>}
        </div>
      </div>

      <div className="results__head">
        <h2 className="page-title kr-subtitle">Rollista</h2>
        {editing !== 'ny' && <button className="btn btn--primary" onClick={() => setEditing('ny')}>+ Lägg till</button>}
      </div>
      {editing === 'ny' && (
        <div className="panel"><CastForm initial={blank} onSave={(d) => saveCast(null, d)} onCancel={() => setEditing(null)} /></div>
      )}
      <div className="kr-cast-grid">
        {cast.map((c) => (
          <div key={c.id} className="panel kr-castcard">
            {editing === c.id ? (
              <CastForm initial={c} onSave={(d) => saveCast(c.id, d)} onCancel={() => setEditing(null)} />
            ) : (
              <>
                <div className="kr-castcard__img">
                  {c.ref_path ? <img src={kronikaUrl(c.ref_path)!} alt={c.name} /> : <span>Ingen referensbild</span>}
                </div>
                <div className="kr-castcard__body">
                  <div className="char__name" style={{ color: c.tag_color }}>{c.name}</div>
                  <div className="char__info">{ROLE_LABELS[c.role]}</div>
                  <p className="kr-castcard__look">{c.look || <i>Inget utseende beskrivet</i>}</p>
                  <div className="actions">
                    <button className="btn btn--small btn--ghost" onClick={() => setEditing(c.id)}>Redigera</button>
                    <button className="btn btn--small btn--danger" onClick={() => removeCast(c)}>Ta bort</button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
