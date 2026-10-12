import { useEffect, useState } from 'react'
import { KNOWN_FLAGS, SLOTS, STATUSES, STATUS_LABELS, STAT_LABELS, normalizeStatKey, statLabel } from '../lib/constants'
import { useStore } from '../lib/store'
import type { ItemDraft } from '../lib/types'

type Props = { draft: ItemDraft; onChange: (d: ItemDraft) => void }

/** Mellanslagsseparerad lista, t.ex. "CLR DRU ELE". */
function ListInput({ value, onChange, placeholder, list }: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  list?: string
}) {
  const joined = value.join(' ')
  const [text, setText] = useState(joined)
  useEffect(() => {
    setText((t) => (t.trim().toUpperCase().split(/[\s,]+/).filter(Boolean).join(' ') === joined ? t : joined))
  }, [joined])
  return (
    <input
      value={text}
      list={list}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value)
        onChange(e.target.value.toUpperCase().split(/[\s,]+/).filter(Boolean))
      }}
    />
  )
}

const numOrNull = (s: string) => (s.trim() === '' || isNaN(Number(s)) ? null : Number(s))

export function ItemFields({ draft, onChange }: Props) {
  const set = <K extends keyof ItemDraft>(k: K, v: ItemDraft[K]) => onChange({ ...draft, [k]: v })
  const [newStat, setNewStat] = useState('')

  const statKeys = Object.keys(draft.stats)

  return (
    <div className="form">
      <label className="field field--wide">
        <span>Namn</span>
        <input value={draft.name} onChange={(e) => set('name', e.target.value)} />
      </label>
      <label className="field">
        <span>Flaggor</span>
        <ListInput value={draft.flags} onChange={(v) => set('flags', v)} placeholder="MAGIC NODROP" />
        <small>{KNOWN_FLAGS.join(' · ')}</small>
      </label>
      <label className="field">
        <span>Slot</span>
        <ListInput value={draft.slots} onChange={(v) => set('slots', v)} placeholder="CHEST" list="slot-list" />
        <datalist id="slot-list">{SLOTS.map((s) => <option key={s} value={s} />)}</datalist>
      </label>
      <label className="field field--narrow">
        <span>AC</span>
        <input inputMode="numeric" value={draft.ac ?? ''} onChange={(e) => set('ac', numOrNull(e.target.value))} />
      </label>
      <label className="field field--narrow">
        <span>Weight</span>
        <input inputMode="decimal" value={draft.weight ?? ''} onChange={(e) => set('weight', numOrNull(e.target.value))} />
      </label>
      <label className="field field--narrow">
        <span>Size</span>
        <input value={draft.size ?? ''} onChange={(e) => set('size', e.target.value.toUpperCase() || null)} />
      </label>

      <fieldset className="field field--wide stats-edit">
        <legend>Stats</legend>
        {statKeys.length === 0 && <small>Inga stats.</small>}
        <div className="stats-edit__grid">
          {statKeys.map((k) => (
            <label key={k} className="stat-chip">
              <span>{statLabel(k)}</span>
              <input
                inputMode="numeric"
                value={draft.stats[k]}
                onChange={(e) => set('stats', { ...draft.stats, [k]: Number(e.target.value) || 0 })}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={`Ta bort ${k}`}
                onClick={() => {
                  const { [k]: _, ...rest } = draft.stats
                  set('stats', rest)
                }}
              >
                ×
              </button>
            </label>
          ))}
        </div>
        <div className="stats-edit__add">
          <input
            list="stat-list"
            placeholder="Lägg till stat, t.ex. WIS"
            value={newStat}
            onChange={(e) => setNewStat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addStat()
              }
            }}
          />
          <datalist id="stat-list">{Object.keys(STAT_LABELS).map((s) => <option key={s} value={s} />)}</datalist>
          <button type="button" className="btn btn--small" onClick={addStat}>Lägg till</button>
        </div>
      </fieldset>

      <label className="field field--wide">
        <span>Effect</span>
        <input value={draft.effect ?? ''} onChange={(e) => set('effect', e.target.value || null)} />
      </label>
      <label className="field field--wide">
        <span>Beskrivning</span>
        <textarea rows={2} value={draft.description ?? ''} onChange={(e) => set('description', e.target.value || null)} />
      </label>
      <label className="field">
        <span>Klasser</span>
        <ListInput value={draft.classes} onChange={(v) => set('classes', v)} placeholder="ALL eller CLR DRU …" />
      </label>
      <label className="field">
        <span>Raser</span>
        <ListInput value={draft.races} onChange={(v) => set('races', v)} placeholder="ALL" />
      </label>
    </div>
  )

  function addStat() {
    const k = normalizeStatKey(newStat)
    if (!k) return
    set('stats', { ...draft.stats, [k]: draft.stats[k] ?? 0 })
    setNewStat('')
  }
}

/** Var itemet finns och vad som händer med det. */
export function OwnershipFields({ draft, onChange }: Props) {
  const { characters } = useStore()
  const set = <K extends keyof ItemDraft>(k: K, v: ItemDraft[K]) => onChange({ ...draft, [k]: v })
  const needsTarget = draft.status === 'utlanad' || draft.status === 'reserverad'

  return (
    <div className="form">
      <label className="field">
        <span>Finns på karaktär</span>
        <select value={draft.holder_id ?? ''} onChange={(e) => set('holder_id', e.target.value || null)}>
          <option value="">— Välj —</option>
          {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Status</span>
        <select value={draft.status} onChange={(e) => set('status', e.target.value as ItemDraft['status'])}>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </label>
      {needsTarget && (
        <label className="field">
          <span>{draft.status === 'utlanad' ? 'Utlånad till' : 'Reserverad för'}</span>
          <select value={draft.lent_to_id ?? ''} onChange={(e) => set('lent_to_id', e.target.value || null)}>
            <option value="">— Välj —</option>
            {characters.filter((c) => c.id !== draft.holder_id).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}
      {draft.status === 'sald' && (
        <label className="field">
          <span>Såld till</span>
          <input value={draft.sold_to ?? ''} onChange={(e) => set('sold_to', e.target.value || null)} placeholder="Namn eller pris" />
        </label>
      )}
      <label className="field field--wide">
        <span>Anteckning</span>
        <input value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value || null)} />
      </label>
    </div>
  )
}
