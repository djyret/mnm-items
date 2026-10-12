import { useEffect, useState } from 'react'
import { COINS, fromPurse, toPurse, type CoinKey } from '../lib/money'

/** Pris med myntsymboler; tomma valörer döljs. */
export function Money({ cp }: { cp: number | null | undefined }) {
  if (cp == null) return null
  const purse = toPurse(cp)
  const shown = COINS.filter((c) => purse[c.key])
  return (
    <span className="money" title={`${cp.toLocaleString('sv-SE')} koppar`}>
      {(shown.length ? shown : [COINS[3]]).map((c) => (
        <span key={c.key} className="money__part">
          {purse[c.key]}
          <i className={`coin coin--${c.key}`} aria-label={c.name} />
        </span>
      ))}
    </span>
  )
}

/** Fyra rutor: platinum, guld, silver, koppar. Tomt i alla = inget pris (null). */
export function PriceInput({ value, onChange }: { value: number | null; onChange: (cp: number | null) => void }) {
  const [text, setText] = useState<Record<CoinKey, string>>(() => purseText(value))

  // Synka in värden som ändras utifrån (t.ex. formuläret nollställs)
  useEffect(() => {
    setText((t) => (toCp(t) === value ? t : purseText(value)))
  }, [value])

  return (
    <div className="price-input">
      {COINS.map((c) => (
        <label key={c.key} className="price-input__coin" title={c.name}>
          <input
            inputMode="numeric"
            value={text[c.key]}
            placeholder="0"
            onChange={(e) => {
              const next = { ...text, [c.key]: e.target.value.replace(/\D/g, '') }
              setText(next)
              onChange(toCp(next))
            }}
          />
          <i className={`coin coin--${c.key}`} aria-label={c.name} />
        </label>
      ))}
    </div>
  )
}

function purseText(cp: number | null): Record<CoinKey, string> {
  const p = toPurse(cp)
  const t = (n: number) => (cp == null || n === 0 ? '' : String(n))
  return { p: t(p.p), g: t(p.g), s: t(p.s), c: t(p.c) }
}

function toCp(t: Record<CoinKey, string>): number | null {
  if (COINS.every((c) => t[c.key] === '')) return null
  return fromPurse({ p: +t.p || 0, g: +t.g || 0, s: +t.s || 0, c: +t.c || 0 })
}
