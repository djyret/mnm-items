import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ClassIcon, ClassPicker } from '../components/ClassIcon'
import { CLASSES } from '../lib/constants'
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
      <label className="field"><span>Namn</span><input required value={d.name} onChange={(e) => set('name', e.target.value)} /></label>
      <label className="field"><span>Spelare</span><input value={d.player ?? ''} onChange={(e) => set('player', e.target.value || null)} placeholder="Vem spelar den?" /></label>
      <div className="field field--wide">
        <span>Klass{d.class ? `: ${CLASSES[d.class] || d.class}` : ' – klicka på en ikon'}</span>
        <ClassPicker classes={Object.keys(CLASSES)} value={d.class ?? ''} onChange={(v) => set('class', v || null)} wide />
      </div>
      <label className="field"><span>Ras</span><input value={d.race ?? ''} onChange={(e) => set('race', e.target.value || null)} placeholder="t.ex. Gnome" /></label>
      <label className="field field--narrow"><span>Level</span><input inputMode="numeric" value={d.level ?? ''} onChange={(e) => set('level', e.target.value ? Number(e.target.value) || null : null)} /></label>
      <label className="check"><input type="checkbox" checked={d.is_main} onChange={(e) => set('is_main', e.target.checked)} /> Main</label>
      <label className="field field--wide"><span>Anteckning</span><input value={d.notes ?? ''} onChange={(e) => set('notes', e.target.value || null)} /></label>
      <div className="actions field--wide">
        <button className="btn btn--primary" disabled={busy}>Spara</button>
        {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel}>Avbryt</button>}
      </div>
    </form>
  )
}

export function Karaktarer() {
  const { characters, items, reload } = useStore()
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(id: string | null, d: CharDraft) {
    setError(null)
    const { error } = id
      ? await supabase.from('characters').update(d).eq('id', id)
      : await supabase.from('characters').insert(d)
    if (error) {
      setError(error.code === '23505' ? `Det finns redan en karaktär som heter ${d.name}.` : error.message)
      return
    }
    await reload()
    setEditing(null)
    setAdding(false)
  }

  async function remove(c: Character) {
    const count = items.filter((i) => i.holder_id === c.id).length
    const msg = count
      ? `${c.name} har ${count} items. De blir kvar men utan ägare. Ta bort ${c.name}?`
      : `Ta bort ${c.name}?`
    if (!confirm(msg)) return
    const { error } = await supabase.from('characters').delete().eq('id', c.id)
    if (error) setError(error.message)
    await reload()
  }

  return (
    <div className="page">
      <div className="results__head">
        <h1 className="page-title">Karaktärer</h1>
        {!adding && <button className="btn btn--primary" onClick={() => setAdding(true)}>+ Ny karaktär</button>}
      </div>
      {error && <div className="alert">{error}</div>}
      {adding && (
        <div className="panel">
          <h2 className="panel-title">Ny karaktär</h2>
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
                    {[c.level && `Level ${c.level}`, c.race, c.class && (CLASSES[c.class] || c.class)].filter(Boolean).join(' · ') || 'Klass och ras ej angivna'}
                  </div>
                  {c.player && <div className="char__info">Spelas av {c.player}</div>}
                    </div>
                  </div>
                  {c.notes && <p className="note">{c.notes}</p>}
                  <div className="char__stats">
                    <Link to={`/?karaktar=${c.id}`}><b>{held.length}</b> items</Link>
                    <span><b>{lentOut}</b> utlånade</span>
                    <span><b>{borrowed}</b> lånade</span>
                  </div>
                  <div className="actions">
                    <Link className="btn" to={`/alt?karaktar=${c.id}`}>Vad kan {c.name} använda?</Link>
                    <button className="btn btn--ghost" onClick={() => setEditing(c.id)}>Redigera</button>
                    <button className="btn btn--danger" onClick={() => remove(c)}>Ta bort</button>
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
