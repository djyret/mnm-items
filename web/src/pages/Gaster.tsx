// Gäster: vänner utanför gänget med egna karaktärer. Gästen skapar och ändrar sina egna; gänget och
// andra gäster kan titta. Inget här rör förrådet (se lib/guests.ts och migrationen guests).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ClassIcon, ClassPicker } from '../components/ClassIcon'
import { useAuth } from '../lib/auth'
import { CLASSES } from '../lib/constants'
import { MAX_GUEST_CHARS, createGuest, guestInfo, useGuestCharacters, type GuestCharacter, type GuestDraft } from '../lib/guests'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'

const blank: GuestDraft = { name: '', class: null, race: null, level: null }

function GuestForm({ initial, onSave, onCancel }: {
  initial: GuestDraft
  onSave: (d: GuestDraft) => Promise<void>
  onCancel?: () => void
}) {
  const [d, setD] = useState(initial)
  const [busy, setBusy] = useState(false)
  const { t } = useI18n()
  const set = <K extends keyof GuestDraft>(k: K, v: GuestDraft[K]) => setD({ ...d, [k]: v })
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
      <label className="field"><span>{t('forradet.form.name')}</span><input required maxLength={40} value={d.name} onChange={(e) => set('name', e.target.value)} /></label>
      <div className="field field--wide">
        <span>{d.class ? t('forradet.chars.classIs', { name: CLASSES[d.class] || d.class }) : t('forradet.chars.classPick')}</span>
        <ClassPicker classes={Object.keys(CLASSES)} value={d.class ?? ''} onChange={(v) => set('class', v || null)} wide />
      </div>
      <label className="field"><span>{t('forradet.chars.race')}</span><input maxLength={40} value={d.race ?? ''} onChange={(e) => set('race', e.target.value || null)} placeholder={t('forradet.chars.racePlaceholder')} /></label>
      <label className="field field--narrow"><span>Level</span><input inputMode="numeric" value={d.level ?? ''} onChange={(e) => set('level', e.target.value ? Math.min(100, Math.max(1, Number(e.target.value) || 1)) : null)} /></label>
      <div className="actions field--wide">
        <button className="btn btn--primary" disabled={busy}>{t('common.save')}</button>
        {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel}>{t('common.cancel')}</button>}
      </div>
    </form>
  )
}

export function Gaster() {
  const { session, access, canEdit, isAdmin, canUseArmory, loading, signIn } = useAuth()
  const { list, error: loadError, reload } = useGuestCharacters()
  const { t } = useI18n()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const uid = session?.user.id

  if (loading) return null
  if (!canUseArmory) {
    return (
      <div className="page">
        <div className="panel empty">
          <p>{t('gaster.closed')}</p>
          {!session && <button className="btn btn--primary" onClick={() => signIn()}>{t('account.signIn')}</button>}
        </div>
      </div>
    )
  }

  const mine = (list ?? []).filter((c) => c.owner_id === uid)
  const canCreate = (access === 'guest' || canEdit) && (isAdmin || mine.length < MAX_GUEST_CHARS)

  async function add(d: GuestDraft) {
    setError(null)
    const err = await createGuest(d, t('armory.sets.now'))
    if (err) return setError(err)
    await reload()
    setAdding(false)
  }

  async function save(id: string, d: GuestDraft) {
    setError(null)
    const { error } = await supabase.from('guest_characters').update(d).eq('id', id)
    if (error) return setError(error.message)
    await reload()
    setEditing(null)
  }

  async function remove(c: GuestCharacter) {
    if (!confirm(t('gaster.deleteConfirm', { name: c.name }))) return
    const { error } = await supabase.from('guest_characters').delete().eq('id', c.id)
    if (error) setError(error.message)
    await reload()
  }

  return (
    <div className="page">
      <div className="results__head">
        <h1 className="page-title">{t('gaster.title')}</h1>
        {canCreate && !adding && <button className="btn btn--primary" onClick={() => setAdding(true)}>{t('gaster.new')}</button>}
      </div>
      <p className="help-intro">{t('gaster.intro')}</p>
      {access === 'guest' && !isAdmin && mine.length >= MAX_GUEST_CHARS && <p className="note">{t('gaster.limit', { n: mine.length })}</p>}
      {(error || loadError) && <div className="alert" role="alert">{error || loadError}</div>}
      {adding && (
        <div className="panel">
          <h2 className="panel-title">{t('gaster.new')}</h2>
          <GuestForm initial={blank} onSave={add} onCancel={() => setAdding(false)} />
        </div>
      )}
      {list === null ? (
        <div className="panel empty">{t('common.loading')}</div>
      ) : list.length === 0 ? (
        <div className="panel empty">{t('gaster.empty')}</div>
      ) : (
        <div className="char-grid">
          {/* Egna karaktärer först */}
          {[...mine, ...list.filter((c) => c.owner_id !== uid)].map((c) => {
            const own = c.owner_id === uid || isAdmin
            return (
              <div key={c.id} className="panel char">
                {editing === c.id ? (
                  <GuestForm initial={c} onSave={(d) => save(c.id, d)} onCancel={() => setEditing(null)} />
                ) : (
                  <>
                    <div className="char__head">
                      <ClassIcon code={c.class} size={64} />
                      <div>
                        <div className="char__name">
                          <Link to={`/gast/${c.id}`}>{c.name}</Link> {c.owner_id === uid && <span className="badge badge--main">{t('gaster.mine')}</span>}
                        </div>
                        <div className="char__info">{guestInfo(c) || t('forradet.chars.noInfo')}</div>
                      </div>
                    </div>
                    <div className="actions">
                      <Link className="btn btn--primary" to={`/gast/${c.id}`}>{t('armory.open')}</Link>
                      {own && <>
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
      )}
    </div>
  )
}
