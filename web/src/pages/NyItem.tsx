import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { isEquipSlot, slotLabel } from '../lib/armory'
import { WikiCredit, WikiSearch } from '../components/Wiki'
import { fetchWikiItem, findExact, wikiFields, wikiToDraft } from '../lib/wiki'
import { ItemFields, OwnershipFields } from '../components/ItemForm'
import { ItemTooltip } from '../components/ItemTooltip'
import { useI18n } from '../lib/i18n'
import { compressImage, cropIcon, emptyDraft, logEvent, parseImage, parsedToDraft, uploadImage } from '../lib/items'
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
  const { reload, characters, charById } = useStore()
  const navigate = useNavigate()
  const { t } = useI18n()
  // Från Armory: /ny?karaktar=<id>&slot=<SLOT> lägger itemet direkt i slotten
  const [params] = useSearchParams()
  const forChar = params.get('karaktar')
  const slotParam = params.get('slot')
  const intoSlot = forChar && isEquipSlot(slotParam) ? slotParam : null
  const [phase, setPhase] = useState<Phase>('tom')
  const [image, setImage] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [icon, setIcon] = useState<Blob | null>(null)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [draft, setDraft] = useState<ItemDraft>(() => ({ ...emptyDraft(), holder_id: forChar ?? readLastHolder() }))
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
      setError(t('forradet.new.notImage'))
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
      // Länka till wikin om namnet finns där exakt; ett fel här stoppar inte avläsningen
      const hit = await findExact(parsed.name).catch(() => null)
      if (hit) setDraft((d) => ({ ...d, ...wikiFields(hit) }))
    } catch (e) {
      setError(t('forradet.new.fillByHand', { error: (e as Error).message }))
    }
    setPhase('klar')
  }, [t])

  async function pickFromWiki(wikiId: string) {
    setError(null)
    setPhase('laser')
    try {
      const { item, wiki } = await fetchWikiItem(wikiId)
      setDraft((d) => wikiToDraft(item, wiki, d))
      setIcon(null)
      setIconPreview(wiki.icon)
    } catch (e) {
      setError((e as Error).message)
    }
    setPhase('klar')
  }

  // Från Armorys wikisök: /ny?…&wiki=<id> fyller i direkt (ref: StrictMode kör effekter två gånger)
  const wikiParam = params.get('wiki')
  const wikiLoaded = useRef(false)
  useEffect(() => {
    if (!wikiParam || wikiLoaded.current) return
    wikiLoaded.current = true
    pickFromWiki(wikiParam)
  }, [wikiParam]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl+V var som helst på sidan
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))?.getAsFile()
      if (file) {
        e.preventDefault()
        handleFile(file)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handleFile])

  async function save() {
    if (!draft.name.trim()) {
      setError(t('forradet.new.needsName'))
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
        .insert({
          ...draft,
          name: draft.name.trim(),
          image_path,
          icon_path,
          // Slotten gäller bara om itemet fortfarande ligger hos karaktären från Armory
          equipped_slot: intoSlot && draft.holder_id === forChar && draft.status === 'ledig' ? intoSlot : null,
        })
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
      navigate(intoSlot ? `/karaktar/${forChar}` : `/item/${data.id}`)
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
      <h1 className="page-title">{t('forradet.new.title')}</h1>
      {intoSlot && (
        <p className="note">{t('armory.new.intoSlot', { slot: slotLabel(intoSlot), name: charById(forChar)?.name ?? '?' })}</p>
      )}

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
          <div className="dropzone__big">{t('forradet.new.pasteWith')} <kbd>Ctrl</kbd>+<kbd>V</kbd></div>
          <div>{t('forradet.new.orDrop')}</div>
          <small>{t('forradet.new.tip')} <kbd>Win</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> {t('forradet.new.tipRest')}</small>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button type="button" className="btn btn--ghost" onClick={(e) => { e.stopPropagation(); setPhase('klar') }}>
            {t('forradet.new.noImage')}
          </button>
        </div>
      )}

      {phase === 'tom' && (
        <div className="panel">
          <h2 className="panel-title">{t('wiki.orSearch')}</h2>
          <WikiSearch onPick={(h) => pickFromWiki(h.id)} />
        </div>
      )}

      {phase === 'laser' && (
        <div className="panel center">
          {preview && <img className="shot" src={preview} alt="" />}
          <p className="pulse">{t('forradet.new.reading')}</p>
        </div>
      )}

      {error && <div className="alert">{error}</div>}

      {(phase === 'klar' || phase === 'sparar') && (
        <div className="new-layout">
          <div className="new-layout__preview">
            <ItemTooltip item={draft} iconUrl={iconPreview} />
            {preview && <img className="shot" src={preview} alt={t('forradet.new.original')} />}
          </div>
          <div className="panel">
            <h2 className="panel-title">{t('forradet.new.check')}</h2>
            {draft.wiki_url && (
              <p className="wiki-linked">
                {t('wiki.linked')} <a href={draft.wiki_url} target="_blank" rel="noreferrer">{t('wiki.open')}</a>
                {' '}<WikiCredit />
              </p>
            )}
            <ItemFields draft={draft} onChange={setDraft} />
            <h2 className="panel-title">{t('forradet.new.where')}</h2>
            <OwnershipFields draft={draft} onChange={setDraft} />
            <div className="actions">
              <button className="btn btn--primary" onClick={save} disabled={phase === 'sparar'}>
                {phase === 'sparar' ? t('forradet.new.saving') : t('forradet.new.save')}
              </button>
              <button className="btn btn--ghost" onClick={reset} disabled={phase === 'sparar'}>{t('forradet.new.restart')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
