import { useEffect, useState } from 'react'
import { CLASSES, KNOWN_FLAGS, SLOTS, STATUSES, STATUS_LABELS, slotIcon, statLabel } from '../lib/constants'
import { ClassIcon } from './ClassIcon'
import { PriceInput } from './Money'
import { useStore } from '../lib/store'
import type { ItemDraft } from '../lib/types'

type Props = { draft: ItemDraft; onChange: (d: ItemDraft) => void }

/** Mellanslagsseparerad lista, t.ex. "CLR DRU ELE". */
function ListInput({ value, onChange, placeholder }: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const joined = value.join(' ')
  const [text, setText] = useState(joined)
  useEffect(() => {
    setText((t) => (t.trim().toUpperCase().split(/[\s,]+/).filter(Boolean).join(' ') === joined ? t : joined))
  }, [joined])
  return (
    <input
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value)
        onChange(e.target.value.toUpperCase().split(/[\s,]+/).filter(Boolean))
      }}
    />
  )
}

const numOrNull = (s: string) => (s.trim() === '' || isNaN(Number(s)) ? null : Number(s))

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/** Stats som erbjuds som snabbknappar i "Lägg till stat". */
const QUICK_STATS = ['STR', 'STA', 'AGI', 'DEX', 'INT', 'WIS', 'CHA', 'HP', 'MANA', 'END', 'DMG', 'DLY',
  'SV_FIRE', 'SV_COLD', 'SV_POISON', 'SV_DISEASE', 'SV_MAGIC', 'SV_CORRUPTION', 'SV_HOLY', 'SV_ELEC']

const SIZES = ['TINY', 'SMALL', 'MEDIUM', 'LARGE', 'GIANT']

/** Slotval med ikoner; flera kan väljas (t.ex. PRIMARY + SECONDARY). */
function SlotPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const extra = value.filter((v) => !SLOTS.includes(v))
  return (
    <div className="icon-picker">
      {[...SLOTS, ...extra].map((s) => (
        <button
          key={s}
          type="button"
          className={`icon-picker__btn${value.includes(s) ? ' is-active' : ''}`}
          title={s}
          aria-pressed={value.includes(s)}
          onClick={() => onChange(toggle(value, s))}
        >
          <img src={slotIcon(s)} alt="" />
          <span>{s === 'SHOULDERS' ? 'SHOULD.' : s === 'SECONDARY' ? 'SECOND.' : s}</span>
        </button>
      ))}
    </div>
  )
}

/** Klassval med ikoner; ALL betyder alla klasser och avmarkerar enskilda. */
function ClassMultiPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const all = value.includes('ALL')
  const unknown = value.filter((v) => v !== 'ALL' && !(v in CLASSES))
  return (
    <>
      <div className="icon-picker icon-picker--classes">
        <button
          type="button"
          className={`icon-picker__btn icon-picker__all${all ? ' is-active' : ''}`}
          aria-pressed={all}
          onClick={() => onChange(all ? [] : ['ALL'])}
        >
          ALL
        </button>
        {Object.keys(CLASSES).map((c) => (
          <button
            key={c}
            type="button"
            className={`icon-picker__btn${!all && value.includes(c) ? ' is-active' : ''}`}
            title={`${c} – ${CLASSES[c]}`}
            aria-pressed={!all && value.includes(c)}
            onClick={() => onChange(toggle(value.filter((v) => v !== 'ALL'), c).sort())}
          >
            <ClassIcon code={c} size={30} />
          </button>
        ))}
      </div>
      {unknown.length > 0 && (
        <small className="warn">
          Okänd klasskod från avläsningen – klicka för att ta bort:
          {unknown.map((u) => (
            <button key={u} type="button" className="chip chip--warn" onClick={() => onChange(value.filter((v) => v !== u))}>
              {u} ×
            </button>
          ))}
        </small>
      )}
    </>
  )
}

export function ItemFields({ draft, onChange }: Props) {
  const set = <K extends keyof ItemDraft>(k: K, v: ItemDraft[K]) => onChange({ ...draft, [k]: v })
  const statKeys = Object.keys(draft.stats)
  const flags = [...KNOWN_FLAGS, ...draft.flags.filter((f) => !KNOWN_FLAGS.includes(f))]

  return (
    <div className="form">
      <label className="field field--wide">
        <span>Namn</span>
        <input value={draft.name} onChange={(e) => set('name', e.target.value)} />
      </label>

      <div className="field field--wide">
        <span>Flaggor</span>
        <div className="chips">
          {flags.map((f) => (
            <button
              key={f}
              type="button"
              className={`chip${draft.flags.includes(f) ? ' is-active' : ''}`}
              aria-pressed={draft.flags.includes(f)}
              onClick={() => set('flags', toggle(draft.flags, f))}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="field field--wide">
        <span>Slot{draft.slots.length ? `: ${draft.slots.join(' + ')}` : ''}</span>
        <SlotPicker value={draft.slots} onChange={(v) => set('slots', v)} />
      </div>

      <label className="field field--narrow">
        <span>AC</span>
        <input inputMode="numeric" value={draft.ac ?? ''} onChange={(e) => set('ac', numOrNull(e.target.value))} />
      </label>
      <label className="field field--narrow">
        <span>Weight</span>
        <input inputMode="decimal" value={draft.weight ?? ''} onChange={(e) => set('weight', numOrNull(e.target.value))} />
      </label>
      <div className="field">
        <span>Size</span>
        <div className="chips">
          {SIZES.map((z) => (
            <button
              key={z}
              type="button"
              className={`chip${draft.size === z ? ' is-active' : ''}`}
              aria-pressed={draft.size === z}
              onClick={() => set('size', draft.size === z ? null : z)}
            >
              {z}
            </button>
          ))}
        </div>
      </div>

      <fieldset className="field field--wide stats-edit">
        <legend>Stats</legend>
        {statKeys.length === 0 && <small>Inga stats – lägg till nedan.</small>}
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
        <div className="chips chips--add">
          <span className="chips__label">Lägg till:</span>
          {QUICK_STATS.filter((k) => !(k in draft.stats)).map((k) => (
            <button key={k} type="button" className="chip" onClick={() => set('stats', { ...draft.stats, [k]: 1 })}>
              + {statLabel(k)}
            </button>
          ))}
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

      <div className="field field--wide">
        <span>Klasser{draft.classes.length ? `: ${draft.classes.join(' ')}` : ''}</span>
        <ClassMultiPicker value={draft.classes} onChange={(v) => set('classes', v)} />
      </div>
      <label className="field">
        <span>Raser</span>
        <ListInput value={draft.races} onChange={(v) => set('races', v)} placeholder="ALL" />
      </label>
    </div>
  )
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
          <input value={draft.sold_to ?? ''} onChange={(e) => set('sold_to', e.target.value || null)} placeholder="Köparens namn" />
        </label>
      )}
      <div className="field field--wide">
        <span>Riktpris – vad den brukar gå för</span>
        <PriceInput value={draft.price_cp} onChange={(v) => set('price_cp', v)} />
      </div>
      {draft.status === 'sald' && (
        <div className="field field--wide">
          <span>Såld för</span>
          <PriceInput value={draft.sold_price_cp} onChange={(v) => set('sold_price_cp', v)} />
        </div>
      )}
      <label className="field field--wide">
        <span>Anteckning</span>
        <input value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value || null)} />
      </label>
    </div>
  )
}
