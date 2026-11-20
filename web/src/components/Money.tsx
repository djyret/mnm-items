import { useEffect, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { COINS, coinName, fromPurse, toPurse, type CoinKey } from '../lib/money'

const coinSrc = (key: CoinKey) => `${import.meta.env.BASE_URL}ikoner/mynt/${key}.webp`

function Coin({ k, name }: { k: CoinKey; name: string }) {
  return <img className="coin" src={coinSrc(k)} alt={name} title={name} />
}

/** Pris med mynt; tomma valörer döljs. */
export function Money({ cp }: { cp: number | null | undefined }) {
  const { t, lang, locale } = useI18n()
  if (cp == null) return null
  const purse = toPurse(cp)
  const shown = COINS.filter((c) => purse[c.key])
  return (
    <span className="money" title={t('forradet.money.inCopper', { n: cp.toLocaleString(locale) })}>
      {(shown.length ? shown : [COINS[3]]).map((c) => (
        <span key={c.key} className="money__part">
          {purse[c.key]}
          <Coin k={c.key} name={coinName(c.key, lang)} />
        </span>
      ))}
    </span>
  )
}

/** Fyra fält i fallande valör: platinum, guld, silver, koppar. Tomt i alla = inget pris (null). */
export function PriceInput({ value, onChange }: { value: number | null; onChange: (cp: number | null) => void }) {
  const { lang } = useI18n()
  const [text, setText] = useState<Record<CoinKey, string>>(() => purseText(value))

  // Synka in värden som ändras utifrån (t.ex. formuläret nollställs)
  useEffect(() => {
    setText((t) => (toCp(t) === value ? t : purseText(value)))
  }, [value])

  return (
    <div className="price-input">
      {COINS.map((c) => {
        const name = coinName(c.key, lang)
        return (
          <label key={c.key} className="price-input__coin">
            <span className="price-input__label">
              <Coin k={c.key} name={name} />
              {name}
            </span>
            <input
              inputMode="numeric"
              value={text[c.key]}
              placeholder="0"
              aria-label={name}
              onChange={(e) => {
                const next = { ...text, [c.key]: e.target.value.replace(/\D/g, '') }
                setText(next)
                onChange(toCp(next))
              }}
            />
          </label>
        )
      })}
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
