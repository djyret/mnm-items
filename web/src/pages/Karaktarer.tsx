import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ClassIcon, ClassPicker } from '../components/ClassIcon'
import { CLASSES } from '../lib/constants'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import type { Character } from '../lib/types'

type CharDraft = Pick<Character, 'name' | 'player' | 'class' | 'race' | 'level' | 'is_main' | 'notes'>

const blank: CharDraft = { name: '', player: null, class: null, race: null, level: null, is_main: false, notes: null }

function CharForm({ initial, onSave, onCancel }: {
  initial: CharDraft
  onSave: (d: CharDraft) => Promise<void>
  onCancel?: () => void
}) {
  const [d, setD] = useState(initial)
  const [busy, setBusy] = useState(false)
  const { t } = useI18n()
  const set = <K extends keyof CharDraft>(k: K, v: CharDraft[K]) => setD({ ...d, [k]: v })
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!d.name.trim()) return
        setBusy(true)
        await onSave({ ...d, name: d.name.trim() })
        setBusy(false)
      }}
    >
      <label className="field"><span>{t('forradet.form.name')}</span><input required value={d.name} onChange={(e) => set('name', e.target.value)} /></label>
      <label className="field"><span>{t('forradet.chars.player')}</span><input value={d.player ?? ''} onChange={(e) => set('player', e.target.value || null)} placeholder={t('forradet.chars.playerPlaceholder')} /></label>
      <div className="field field--wide">
        <span>{d.class ? t('forradet.chars.classIs', { name: CLASSES[d.class] || d.class }) : t('forradet.chars.classPick')}</span>
        <ClassPicker classes={Object.keys(CLASSES)} value={d.class ?? ''} onChange={(v) => set('class', v || null)} wide />
      </div>
      <label className="field"><span>{t('forradet.chars.race')}</span><input value={d.race ?? ''} onChange={(e) => set('race', e.target.value || null)} placeholder={t('forradet.chars.racePlaceholder')} /></label>
      <label className="field field--narrow"><span>Level</span><input inputMode="numeric" value={d.level ?? ''} onChange={(e) => set('level', e.target.value ? Number(e.target.value) || null : null)} /></label>
      <label className="check"><input type="checkbox" checked={d.is_main} onChange={(e) => set('is_main', e.target.checked)} /> Main</label>
      <label className="field field--wide"><span>{t('forradet.form.notes')}</span><input value={d.notes ?? ''} onChange={(e) => set('notes', e.target.value || null)} /></label>
      <div className="actions field--wide">
        <button className="btn btn--primary" disabled={busy}>{t('common.save')}</button>
        {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel}>{t('common.cancel')}</button>}
      </div>
    </form>
  )
}

export function Karaktarer() {
  const { characters, items, reload } = useStore()
  const { canEdit } = useAuth()
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()

  async function save(id: string | null, d: CharDraft) {
    setError(null)
    const { error } = id
      ? await supabase.from('characters').update(d).eq('id', id)
      : await supabase.from('characters').insert(d)
    if (error) {
      setError(error.code === '23505' ? t('forradet.chars.duplicate', { name: d.name }) : error.message)
      return
    }
    await reload()
    setEditing(null)
    setAdding(false)
  }

  async function remove(c: Character) {
    const count = items.filter((i) => i.holder_id === c.id).length
    const msg = count
      ? t('forradet.chars.deleteWithItems', { name: c.name, count })
      : t('forradet.chars.deleteConfirm', { name: c.name })
    if (!confirm(msg)) return
    const { error } = await supabase.from('characters').delete().eq('id', c.id)
    if (error) setError(error.message)
    await reload()
  }

  return (
    <div className="page">
      <div className="results__head">
        <h1 className="page-title">{t('nav.characters')}</h1>
        {canEdit && !adding && <button className="btn btn--primary" onClick={() => setAdding(true)}>{t('forradet.chars.new')}</button>}
      </div>
      {error && <div className="alert">{error}</div>}
      {adding && (
        <div className="panel">
          <h2 className="panel-title">{t('forradet.chars.newTitle')}</h2>
          <CharForm initial={blank} onSave={(d) => save(null, d)} onCancel={() => setAdding(false)} />
        </div>
      )}
      <div className="char-grid">
        {characters.map((c) => {
          const held = items.filter((i) => i.holder_id === c.id && i.status !== 'sald')
          const lentOut = held.filter((i) => i.status === 'utlanad').length
          const borrowed = items.filter((i) => i.lent_to_id === c.id && i.status === 'utlanad').length
          return (
            <div key={c.id} className="panel char">
              {editing === c.id ? (
                <CharForm initial={c} onSave={(d) => save(c.id, d)} onCancel={() => setEditing(null)} />
              ) : (
                <>
                  <div className="char__head">
                    <ClassIcon code={c.class} size={64} />
                    <div>
                  <div className="char__name">
                    {c.name} {c.is_main && <span className="badge badge--main">Main</span>}
                  </div>
                  <div className="char__info">
                    {[c.level && `Level ${c.level}`, c.race, c.class && (CLASSES[c.class] || c.class)].filter(Boolean).join(' · ') || t('forradet.chars.noInfo')}
                  </div>
                  {c.player && <div className="char__info">{t('forradet.chars.playedBy', { player: c.player })}</div>}
                    </div>
                  </div>
                  {c.notes && <p className="note">{c.notes}</p>}
                  <div className="char__stats">
                    <Link to={`/?karaktar=${c.id}`}><b>{held.length}</b> {t('forradet.chars.items')}</Link>
                    <span><b>{lentOut}</b> {t('forradet.chars.lentOut')}</span>
                    <span><b>{borrowed}</b> {t('forradet.chars.borrowed')}</span>
                  </div>
                  <div className="actions">
                    <Link className="btn" to={`/alt?karaktar=${c.id}`}>{t('forradet.chars.whatCanUse', { name: c.name })}</Link>
                    {canEdit && <>
                      <button className="btn btn--ghost" onClick={() => setEditing(c.id)}>{t('common.edit')}</button>
                      <button className="btn btn--danger" onClick={() => remove(c)}>{t('common.delete')}</button>
                    </>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
