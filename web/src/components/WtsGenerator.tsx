import { useEffect, useMemo, useRef, useState } from 'react'
import { buildWts } from '../lib/gamelink'
import { imageUrl } from '../lib/supabase'
import { isNoDrop } from '../lib/items'
import { useStore } from '../lib/store'
import { Money } from './Money'
import { ItemIcon } from './ItemTooltip'

// Chattrutan rymmer 255 tecken; 250 lämnar plats för "/auc " före inklistringen
const SETTINGS_KEY = 'mnm:wts'

function loadSettings() {
  try {
    return { prefix: 'WTS', suffix: '- PST', maxLen: 250, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }
  } catch {
    return { prefix: 'WTS', suffix: '- PST', maxLen: 250 }
  }
}

/** Välj items och få en färdig WTS-text att klistra in i /auc eller /ooc. */
export function WtsGenerator({ onClose }: { onClose: () => void }) {
  const { items, charById } = useStore()
  const forSale = useMemo(
    () => items.filter((i) => (i.status === 'ledig' || i.status === 'reserverad') && !isNoDrop(i)),
    [items],
  )
  const [picked, setPicked] = useState<Set<string>>(new Set())
  // Förvälj items med pris första gången listan har innehåll (itemsen kan laddas efter att panelen öppnats)
  const preselected = useRef(false)
  useEffect(() => {
    if (preselected.current || forSale.length === 0) return
    preselected.current = true
    setPicked(new Set(forSale.filter((i) => i.price_cp != null).map((i) => i.id)))
  }, [forSale])
  const [opt, setOpt] = useState(loadSettings)
  const [copied, setCopied] = useState<number | null>(null)

  const setOption = (patch: Partial<typeof opt>) => {
    const next = { ...opt, ...patch }
    setOpt(next)
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    } catch {
      /* privat läge */
    }
  }

  const chosen = forSale.filter((i) => picked.has(i.id))
  const lines = buildWts(chosen, {
    ...opt,
    maxLen: Math.max(40, Number(opt.maxLen) || 250),
  })

  async function copy(idx: number) {
    try {
      await navigator.clipboard.writeText(lines[idx])
      setCopied(idx)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setCopied(-1)
    }
  }

  const toggle = (id: string) => {
    const n = new Set(picked)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    setPicked(n)
  }

  return (
    <div className="panel wts">
      <div className="wts__head">
        <h2 className="panel-title">Skapa WTS-text</h2>
        <button type="button" className="icon-btn" aria-label="Stäng" onClick={onClose}>×</button>
      </div>

      <div className="wts__grid">
        <div>
          <div className="wts__listhead">
            <span>{chosen.length} av {forSale.length} valda</span>
            <button type="button" className="chip" onClick={() => setPicked(new Set(forSale.map((i) => i.id)))}>Alla</button>
            <button type="button" className="chip" onClick={() => setPicked(new Set())}>Inga</button>
          </div>
          <ul className="wts__list">
            {forSale.map((i) => (
              <li key={i.id}>
                <label className={`wts__row${picked.has(i.id) ? ' is-active' : ''}`}>
                  <input type="checkbox" checked={picked.has(i.id)} onChange={() => toggle(i.id)} />
                  <ItemIcon src={imageUrl(i.icon_path)} slot={i.slots[0]} size="sm" />
                  <span className="wts__name">
                    {i.name}
                    <small>
                      {charById(i.holder_id)?.name ?? '—'}
                    </small>
                  </span>
                  {i.price_cp != null ? <Money cp={i.price_cp} /> : <small className="note">inget pris</small>}
                </label>
              </li>
            ))}
            {forSale.length === 0 && <li className="note">Inga lediga, tradebara items.</li>}
          </ul>
        </div>

        <div>
          <div className="wts__opts">
            <label className="field">
              <span>Början</span>
              <input value={opt.prefix} onChange={(e) => setOption({ prefix: e.target.value })} />
            </label>
            <label className="field">
              <span>Slut</span>
              <input value={opt.suffix} onChange={(e) => setOption({ suffix: e.target.value })} placeholder="- PST" />
            </label>
            <label className="field field--narrow">
              <span>Max tecken/rad</span>
              <input inputMode="numeric" value={opt.maxLen} onChange={(e) => setOption({ maxLen: e.target.value.replace(/\D/g, '') })} />
            </label>


          </div>


          {lines.length === 0 ? (
            <p className="note">Välj items i listan.</p>
          ) : (
            lines.map((line, idx) => (
              <div key={idx} className="wts__out">
                <div className="wts__outhead">
                  <span>
                    {lines.length > 1 ? `Rad ${idx + 1} av ${lines.length} · ` : ''}
                    {line.length} av 255 tecken
                  </span>
                  <button type="button" className="btn btn--primary btn--small" onClick={() => copy(idx)}>
                    {copied === idx ? 'Kopierat!' : 'Kopiera'}
                  </button>
                </div>
                <textarea readOnly rows={3} value={line} onFocus={(e) => e.target.select()} />
              </div>
            ))
          )}
          {copied === -1 && <p className="alert">Kunde inte kopiera automatiskt – markera texten och tryck Ctrl+C.</p>}
          <p className="note">
            Klistra in i spelet med Ctrl+V efter <code>/auc</code> eller <code>/ooc</code>. Spelet godtar inte inklistrade
            itemlänkar – vill du ha klickbara länkar, lägg in dem i chatten inne i spelet.
          </p>
        </div>
      </div>
    </div>
  )
}
