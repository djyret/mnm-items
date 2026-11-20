import { useEffect, useState } from 'react'
import { CLASSES, KNOWN_FLAGS, SLOTS, STATUSES, slotIcon, statLabel, statusLabel } from '../lib/constants'
import { useI18n } from '../lib/i18n'
import { ClassIcon } from './ClassIcon'
import { PriceInput } from './Money'
import { useStore } from '../lib/store'
import { useChapters } from '../lib/armory'
import type { ItemDraft } from '../lib/types'
import { Icon } from './Icon'

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
  const { t } = useI18n()
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
          {t('forradet.form.unknownClass')}
          {unknown.map((u) => (
            <button key={u} type="button" className="chip chip--warn" onClick={() => onChange(value.filter((v) => v !== u))}>
              {u} <Icon name="stang" size={12} />
            </button>
          ))}
        </small>
      )}
    </>
  )
}

export function ItemFields({ draft, onChange }: Props) {
  const set = <K extends keyof ItemDraft>(k: K, v: ItemDraft[K]) => onChange({ ...draft, [k]: v })
  const { t } = useI18n()
  const statKeys = Object.keys(draft.stats)
  const flags = [...KNOWN_FLAGS, ...draft.flags.filter((f) => !KNOWN_FLAGS.includes(f))]

  return (
    <div className="form">
      <label className="field field--wide">
        <span>{t('forradet.form.name')}</span>
        <input value={draft.name} onChange={(e) => set('name', e.target.value)} />
      </label>

      <div className="field field--wide">
        <span>{t('forradet.form.flags')}</span>
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
        {statKeys.length === 0 && <small>{t('forradet.form.noStats')}</small>}
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
                aria-label={t('forradet.form.removeStat', { stat: k })}
                onClick={() => {
                  const { [k]: _, ...rest } = draft.stats
                  set('stats', rest)
                }}
              >
                <Icon name="stang" size={14} />
              </button>
            </label>
          ))}
        </div>
        <div className="chips chips--add">
          <span className="chips__label">{t('forradet.form.addStat')}</span>
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
        <span>{t('forradet.form.description')}</span>
        <textarea rows={2} value={draft.description ?? ''} onChange={(e) => set('description', e.target.value || null)} />
      </label>

      <div className="field field--wide">
        <span>{t('forradet.form.classes')}{draft.classes.length ? `: ${draft.classes.join(' ')}` : ''}</span>
        <ClassMultiPicker value={draft.classes} onChange={(v) => set('classes', v)} />
      </div>
      <label className="field">
        <span>{t('forradet.form.races')}</span>
        <ListInput value={draft.races} onChange={(v) => set('races', v)} placeholder="ALL" />
      </label>
    </div>
  )
}

/** Var itemet finns och vad som händer med det. */
export function OwnershipFields({ draft, onChange }: Props) {
  const { characters } = useStore()
  const { t, lang } = useI18n()
  const chapters = useChapters()
  const set = <K extends keyof ItemDraft>(k: K, v: ItemDraft[K]) => onChange({ ...draft, [k]: v })
  const needsTarget = draft.status === 'utlanad' || draft.status === 'reserverad'

  return (
    <div className="form">
      <label className="field">
        <span>{t('forradet.form.holder')}</span>
        <select value={draft.holder_id ?? ''} onChange={(e) => set('holder_id', e.target.value || null)}>
          <option value="">{t('forradet.form.choose')}</option>
          {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="field">
        <span>{t('forradet.form.status')}</span>
        <select value={draft.status} onChange={(e) => set('status', e.target.value as ItemDraft['status'])}>
          {/* Utrustad sätts genom att välja slot (Armory/itemsidan), inte här */}
          {STATUSES.filter((s) => s !== 'equippad' || draft.status === 'equippad').map((s) => (
            <option key={s} value={s}>{statusLabel(s, lang)}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{t('armory.item.foundChapter')}</span>
        <select value={draft.found_chapter_id ?? ''} onChange={(e) => set('found_chapter_id', e.target.value || null)}>
          <option value="">{t('armory.item.noChapter')}</option>
          {chapters.map((c) => <option key={c.id} value={c.id}>{c.played_on} · {c.title}</option>)}
        </select>
      </label>
      {needsTarget && (
        <label className="field">
          <span>{draft.status === 'utlanad' ? t('forradet.form.lentTo') : t('forradet.form.reservedFor')}</span>
          <select value={draft.lent_to_id ?? ''} onChange={(e) => set('lent_to_id', e.target.value || null)}>
            <option value="">{t('forradet.form.choose')}</option>
            {characters.filter((c) => c.id !== draft.holder_id).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}
      {draft.status === 'sald' && (
        <label className="field">
          <span>{t('forradet.form.soldTo')}</span>
          <input value={draft.sold_to ?? ''} onChange={(e) => set('sold_to', e.target.value || null)} placeholder={t('forradet.form.buyerPlaceholder')} />
        </label>
      )}
      <div className="field field--wide">
        <span>{t('forradet.form.guidePrice')}</span>
        <PriceInput value={draft.price_cp} onChange={(v) => set('price_cp', v)} />
      </div>
      {draft.status === 'sald' && (
        <div className="field field--wide">
          <span>{t('forradet.form.soldFor')}</span>
          <PriceInput value={draft.sold_price_cp} onChange={(v) => set('sold_price_cp', v)} />
        </div>
      )}
      <label className="field field--wide">
        <span>{t('forradet.form.notes')}</span>
        <input value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value || null)} />
      </label>
    </div>
  )
}
