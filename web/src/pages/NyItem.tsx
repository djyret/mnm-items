import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ItemFields, OwnershipFields } from '../components/ItemForm'
import { ItemTooltip } from '../components/ItemTooltip'
import { compressImage, cropIcon, emptyDraft, logEvent, parseImage, parsedToDraft, uploadImage } from '../lib/items'
import { extractGameLink, nameFromGameLink } from '../lib/gamelink'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import type { ItemDraft } from '../lib/types'

type Phase = 'tom' | 'laser' | 'klar' | 'sparar'

const LAST_HOLDER_KEY = 'mnm:lastHolder'

function readLastHolder(): string | null {
  try {
    return localStorage.getItem(LAST_HOLDER_KEY)
  } catch {
    return null
  }
}

export function NyItem() {
  const { reload, characters } = useStore()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('tom')
  const [image, setImage] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [icon, setIcon] = useState<Blob | null>(null)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [draft, setDraft] = useState<ItemDraft>(() => ({ ...emptyDraft(), holder_id: readLastHolder() }))
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // Glöm sparad ägare om karaktären inte finns längre
  useEffect(() => {
    if (characters.length && draft.holder_id && !characters.some((c) => c.id === draft.holder_id)) {
      setDraft((d) => ({ ...d, holder_id: null }))
    }
  }, [characters, draft.holder_id])

  const handleFile = useCallback(async (file: Blob) => {
    if (!file.type.startsWith('image/')) {
      setError('Det där är ingen bild.')
      return
    }
    setError(null)
    setPhase('laser')
    try {
      const small = await compressImage(file)
      setImage(small)
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old)
        return URL.createObjectURL(small)
      })
      const parsed = await parseImage(small)
      setDraft((d) => parsedToDraft(parsed, d))
      if (parsed.icon_box) {
        const ic = await cropIcon(small, parsed.icon_box)
        setIcon(ic)
        setIconPreview(URL.createObjectURL(ic))
      }
    } catch (e) {
      setError(`${(e as Error).message}. Fyll i fälten för hand.`)
    }
    setPhase('klar')
  }, [])

  // Ctrl+V var som helst på sidan
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))?.getAsFile()
      if (file) {
        e.preventDefault()
        handleFile(file)
        return
      }
      // Itemlänk från spelets chatt – fyll i spellänk (och namn om det saknas)
      const link = extractGameLink(e.clipboardData?.getData('text') ?? '')
      if (link && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        setDraft((d) => ({ ...d, game_link: link, name: d.name || nameFromGameLink(link) || '' }))
        setPhase((p) => (p === 'tom' ? 'klar' : p))
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handleFile])

  async function save() {
    if (!draft.name.trim()) {
      setError('Itemet behöver ett namn.')
      return
    }
    setPhase('sparar')
    setError(null)
    try {
      const [image_path, icon_path] = await Promise.all([
        image ? uploadImage(image) : null,
        icon ? uploadImage(icon, '-icon') : null,
      ])
      const { data, error } = await supabase
        .from('items')
        .insert({ ...draft, name: draft.name.trim(), image_path, icon_path })
        .select('id')
        .single()
      if (error) throw error
      await logEvent(data.id, 'skapad', { to_id: draft.holder_id })
      try {
        if (draft.holder_id) localStorage.setItem(LAST_HOLDER_KEY, draft.holder_id)
      } catch {
        /* privat läge */
      }
      await reload()
      navigate(`/item/${data.id}`)
    } catch (e) {
      setError((e as Error).message)
      setPhase('klar')
    }
  }

  function reset() {
    setImage(null)
    setPreview(null)
    setIcon(null)
    setIconPreview(null)
    setDraft({ ...emptyDraft(), holder_id: draft.holder_id })
    setPhase('tom')
    setError(null)
  }

  return (
    <div className="page">
      <h1 className="page-title">Lägg till item</h1>

      {phase === 'tom' && (
        <div
          className={`dropzone${dragging ? ' dropzone--over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const f = e.dataTransfer.files[0]
            if (f) handleFile(f)
          }}
          onClick={() => fileInput.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="dropzone__big">Klistra in screenshot med <kbd>Ctrl</kbd>+<kbd>V</kbd></div>
          <div>…eller dra hit en bild, eller klicka för att välja fil</div>
          <small>Tips: <kbd>Win</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> i spelet, markera statsrutan, sedan Ctrl+V här.</small>
          <small>Itemlänken från spelets chatt kan också klistras in här – före eller efter bilden.</small>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button type="button" className="btn btn--ghost" onClick={(e) => { e.stopPropagation(); setPhase('klar') }}>
            Fyll i utan bild
          </button>
        </div>
      )}

      {phase === 'laser' && (
        <div className="panel center">
          {preview && <img className="shot" src={preview} alt="" />}
          <p className="pulse">Läser av statsrutan…</p>
        </div>
      )}

      {error && <div className="alert">{error}</div>}

      {(phase === 'klar' || phase === 'sparar') && (
        <div className="new-layout">
          <div className="new-layout__preview">
            <ItemTooltip item={draft} iconUrl={iconPreview} />
            {preview && <img className="shot" src={preview} alt="Originalbild" />}
          </div>
          <div className="panel">
            <h2 className="panel-title">Kontrollera avläsningen</h2>
            <ItemFields draft={draft} onChange={setDraft} />
            <h2 className="panel-title">Var finns det?</h2>
            <OwnershipFields draft={draft} onChange={setDraft} />
            <div className="actions">
              <button className="btn btn--primary" onClick={save} disabled={phase === 'sparar'}>
                {phase === 'sparar' ? 'Sparar…' : 'Spara item'}
              </button>
              <button className="btn btn--ghost" onClick={reset} disabled={phase === 'sparar'}>Börja om</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
