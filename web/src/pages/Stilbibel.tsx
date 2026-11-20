import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROLES, deleteKronika, imageFiles, kronikaUrl, loadCastAndStyle, missingTables, storeImage, withParts } from '../lib/kronikan'
import { useI18n } from '../lib/i18n'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { CastMember } from '../lib/types'
import { MissingSetup } from './Kronikan'
import { Icon } from '../components/Icon'

type CastDraft = Pick<CastMember, 'name' | 'role' | 'tag_color' | 'look' | 'ref_path'>

const blank: CastDraft = { name: '', role: 'hjalte', tag_color: '#8fc8ff', look: '', ref_path: null }

function CastForm({ initial, onSave, onCancel }: {
  initial: CastDraft
  onSave: (d: CastDraft) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useI18n()
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
        {uploading ? <span className="pulse">…</span> : d.ref_path ? <img src={kronikaUrl(d.ref_path)!} alt="" /> : <span>{withParts(t('kronikan.style.refImage'), { keys: <><kbd>Ctrl</kbd>+<kbd>V</kbd></> })}</span>}
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => setImage(imageFiles(e.target.files))} />
      </div>
      <div className="kr-cast-form__fields">
        <div className="form">
          <label className="field"><span>{t('kronikan.style.name')}</span><input required value={d.name} onChange={(e) => set('name', e.target.value)} /></label>
          <label className="field field--narrow"><span>{t('kronikan.style.tagColor')}</span><input type="color" value={d.tag_color} onChange={(e) => set('tag_color', e.target.value)} /></label>
        </div>
        <div className="chips">
          {ROLES.map((r) => (
            <button key={r} type="button" className={`chip${d.role === r ? ' is-active' : ''}`} onClick={() => set('role', r)}>{t(`kronikan.role.${r}`)}</button>
          ))}
        </div>
        <label className="field">
          <span>{t('kronikan.style.look')}</span>
          <textarea rows={4} value={d.look} onChange={(e) => set('look', e.target.value)} placeholder={t('kronikan.style.lookPlaceholder')} />
        </label>
        <div className="actions">
          <button className="btn btn--primary" disabled={busy || uploading}>{t('common.save')}</button>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>{t('common.cancel')}</button>
        </div>
      </div>
    </form>
  )
}

export function Stilbibel() {
  const { canEdit } = useAuth()
  const { t } = useI18n()
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
      setError(error.code === '23505' ? t('kronikan.style.duplicate', { name: d.name }) : error.message)
      return
    }
    if (old?.ref_path && old.ref_path !== d.ref_path) deleteKronika(old.ref_path)
    setEditing(null)
    await load()
  }

  async function removeCast(c: CastMember) {
    if (!confirm(t('kronikan.style.confirmRemove', { name: c.name }))) return
    const { error } = await supabase.from('chronicle_cast').delete().eq('id', c.id)
    if (error) return setError(error.message)
    await deleteKronika(c.ref_path)
    await load()
  }

  if (missingTables(error ?? undefined)) {
    return <div className="page"><h1 className="page-title">{t('kronikan.style.title')}</h1><MissingSetup /></div>
  }

  return (
    <div className="page">
      <Link to="/kronikan" className="back"><Icon name="vanster" size={14} /> {t('kronikan.title')}</Link>
      <h1 className="page-title">{t('kronikan.style.title')}</h1>
      <p className="help-intro">
        {t('kronikan.style.intro')}
      </p>
      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <h2 className="panel-title">{t('kronikan.style.style')}</h2>
        <textarea className="kr-style" rows={9} value={style} onChange={(e) => setStyle(e.target.value)} disabled={loading} readOnly={!canEdit} />
        {canEdit && <div className="actions">
          <button className="btn btn--primary" onClick={saveStyle} disabled={style === savedStyle}>{t('kronikan.style.saveStyle')}</button>
          {style !== savedStyle && <button className="btn btn--ghost" onClick={() => setStyle(savedStyle)}>{t('kronikan.style.undo')}</button>}
        </div>}
      </div>

      <div className="results__head">
        <h2 className="page-title kr-subtitle">{t('kronikan.style.cast')}</h2>
        {canEdit && editing !== 'ny' && <button className="btn btn--primary" onClick={() => setEditing('ny')}>{t('kronikan.style.add')}</button>}
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
                  {c.ref_path ? <img src={kronikaUrl(c.ref_path)!} alt={c.name} /> : <span>{t('kronikan.style.noRef')}</span>}
                </div>
                <div className="kr-castcard__body">
                  <div className="char__name" style={{ color: c.tag_color }}>{c.name}</div>
                  <div className="char__info">{t(`kronikan.role.${c.role}`)}</div>
                  <p className="kr-castcard__look">{c.look || <i>{t('kronikan.style.noLook')}</i>}</p>
                  {canEdit && <div className="actions">
                    <button className="btn btn--small btn--ghost" onClick={() => setEditing(c.id)}>{t('common.edit')}</button>
                    <button className="btn btn--small btn--danger" onClick={() => removeCast(c)}>{t('common.delete')}</button>
                  </div>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
