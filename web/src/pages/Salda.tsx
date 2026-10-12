import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClassIcon } from '../components/ClassIcon'
import { Money } from '../components/Money'
import { ItemIcon } from '../components/ItemTooltip'
import { useStore } from '../lib/store'
import { imageUrl, supabase } from '../lib/supabase'
import type { Item } from '../lib/types'

interface Sale {
  item: Item
  date: string
  sellerId: string | null
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('sv-SE')

/** Alla sålda items med pris, säljare och datum – och summor. */
export function Salda() {
  const { items, charById } = useStore()
  const [saleDates, setSaleDates] = useState<Map<string, { date: string; from: string | null }>>(new Map())
  const [seller, setSeller] = useState('')

  const sold = useMemo(() => items.filter((i) => i.status === 'sald'), [items])

  // Försäljningsdatum och säljare hämtas ur historiken (senaste "sald"-händelsen per item)
  useEffect(() => {
    if (!sold.length) return
    supabase
      .from('item_events')
      .select('item_id, from_id, created_at')
      .eq('kind', 'sald')
      .in('item_id', sold.map((i) => i.id))
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const m = new Map<string, { date: string; from: string | null }>()
        for (const e of data ?? []) m.set(e.item_id, { date: e.created_at, from: e.from_id })
        setSaleDates(m)
      })
  }, [sold])

  const sales: Sale[] = useMemo(
    () =>
      sold
        .map((item) => {
          const ev = saleDates.get(item.id)
          return { item, date: ev?.date ?? item.updated_at, sellerId: ev?.from ?? item.holder_id }
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [sold, saleDates],
  )

  const shown = seller ? sales.filter((s) => s.sellerId === seller) : sales
  const total = shown.reduce((sum, s) => sum + (s.item.price_cp ?? 0), 0)
  const withoutPrice = shown.filter((s) => s.item.price_cp == null).length

  // Summa per säljare (alltid över alla försäljningar)
  const perSeller = useMemo(() => {
    const m = new Map<string, { cp: number; n: number }>()
    for (const s of sales) {
      const k = s.sellerId ?? ''
      const cur = m.get(k) ?? { cp: 0, n: 0 }
      m.set(k, { cp: cur.cp + (s.item.price_cp ?? 0), n: cur.n + 1 })
    }
    return [...m.entries()].sort((a, b) => b[1].cp - a[1].cp)
  }, [sales])

  const best = shown.reduce<Sale | null>((b, s) => ((s.item.price_cp ?? 0) > (b?.item.price_cp ?? 0) ? s : b), null)

  return (
    <div className="page">
      <h1 className="page-title">Sålda items</h1>

      <div className="sales-summary">
        <div className="panel stat-box stat-box--total">
          <span className="stat-box__label">{seller ? `Sålt av ${charById(seller)?.name}` : 'Totalt sålt'}</span>
          <span className="stat-box__value"><Money cp={total} /></span>
          <span className="stat-box__sub">
            {shown.length} items{withoutPrice ? ` · ${withoutPrice} utan pris` : ''}
          </span>
        </div>
        <div className="panel stat-box">
          <span className="stat-box__label">Snittpris</span>
          <span className="stat-box__value">
            <Money cp={shown.length - withoutPrice ? Math.round(total / (shown.length - withoutPrice)) : 0} />
          </span>
          <span className="stat-box__sub">per item med pris</span>
        </div>
        <div className="panel stat-box">
          <span className="stat-box__label">Dyraste försäljning</span>
          <span className="stat-box__value">{best ? <Money cp={best.item.price_cp} /> : '—'}</span>
          <span className="stat-box__sub">{best ? best.item.name : 'Inget sålt än'}</span>
        </div>
      </div>

      {perSeller.length > 0 && (
        <div className="panel">
          <h2 className="panel-title">Per säljare – klicka för att filtrera</h2>
          <div className="seller-list">
            <button type="button" className={`seller${seller === '' ? ' is-active' : ''}`} onClick={() => setSeller('')}>
              <span className="seller__name">Alla</span>
              <Money cp={sales.reduce((s, x) => s + (x.item.price_cp ?? 0), 0)} />
              <span className="seller__n">{sales.length} st</span>
            </button>
            {perSeller.map(([id, v]) => {
              const c = charById(id)
              return (
                <button
                  key={id || 'okand'}
                  type="button"
                  className={`seller${seller === id ? ' is-active' : ''}`}
                  onClick={() => setSeller(seller === id ? '' : id)}
                >
                  <ClassIcon code={c?.class} size={30} />
                  <span className="seller__name">{c?.name ?? 'Okänd'}</span>
                  <Money cp={v.cp} />
                  <span className="seller__n">{v.n} st</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="panel">
        <h2 className="panel-title">Försäljningar</h2>
        {shown.length === 0 ? (
          <p className="note">
            Inga sålda items än. Markera ett item som sålt på dess sida (“Markera såld”) så hamnar det här.
          </p>
        ) : (
          <div className="sales-table-wrap">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Item</th>
                  <th>Säljare</th>
                  <th>Köpare</th>
                  <th className="num">Pris</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => (
                  <tr key={s.item.id}>
                    <td className="date">{fmtDate(s.date)}</td>
                    <td>
                      <Link to={`/item/${s.item.id}`} className="sale-item">
                        <ItemIcon src={imageUrl(s.item.icon_path)} slot={s.item.slots[0]} size="sm" />
                        <span>{s.item.name}</span>
                      </Link>
                    </td>
                    <td>{charById(s.sellerId)?.name ?? '—'}</td>
                    <td>{s.item.sold_to ?? '—'}</td>
                    <td className="num">{s.item.price_cp != null ? <Money cp={s.item.price_cp} /> : <span className="note">inget pris</span>}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>Summa ({shown.length} items)</td>
                  <td className="num"><Money cp={total} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
