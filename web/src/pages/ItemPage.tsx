import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { HolderBadge, NoDropBadge, StatusBadge } from '../components/Badges'
import { ItemFields, OwnershipFields } from '../components/ItemForm'
import { ItemTooltip } from '../components/ItemTooltip'
import { STATUS_LABELS } from '../lib/constants'
import { compressImage, cropIcon, deleteImages, isNoDrop, logEvent, parseImage, uploadImage } from '../lib/items'
import { useStore } from '../lib/store'
import { imageUrl, supabase } from '../lib/supabase'
import type { Item, ItemDraft, ItemEvent } from '../lib/types'

const EVENT_TEXT: Record<string, string> = {
  skapad: 'Lades till',
  flyttad: 'Flyttades',
  utlanad: 'Lånades ut',
  aterlamnad: 'Lämnades tillbaka',
  sald: 'Såldes',
  status: 'Ändrade status',
  redigerad: 'Redigerades',
}

export function ItemPage() {
  const { id } = useParams()
  const { items, characters, charById, reload, loading } = useStore()
  const navigate = useNavigate()
  const item = items.find((i) => i.id === id)
  const [events, setEvents] = useState<ItemEvent[]>([])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ItemDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [lendTo, setLendTo] = useState('')
  const [moveTo, setMoveTo] = useState('')
  const [soldTo, setSoldTo] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    supabase
      .from('item_events')
      .select('*')
      .eq('item_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setEvents((data as ItemEvent[]) ?? []))
  }, [id, item?.updated_at])

  if (!item) {
    return (
      <div className="page">
        <div className="panel empty">{loading ? 'Laddar…' : <>Itemet finns inte. <Link to="/">Till förrådet</Link></>}</div>
      </div>
    )
  }

  async function patch(changes: Partial<Item>, event?: Parameters<typeof logEvent>) {
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('items').update(changes).eq('id', item!.id)
    if (error) setError(error.message)
    else if (event) await logEvent(...event)
    await reload()
    setBusy(false)
    return !error
  }

  const lend = () =>
    lendTo &&
    patch({ status: 'utlanad', lent_to_id: lendTo }, [item.id, 'utlanad', { from_id: item.holder_id, to_id: lendTo }]).then(() => setLendTo(''))

  const giveBack = () =>
    patch({ status: 'ledig', lent_to_id: null }, [item.id, 'aterlamnad', { from_id: item.lent_to_id, to_id: item.holder_id }])

  const move = () =>
    moveTo &&
    patch(
      { holder_id: moveTo, status: 'ledig', lent_to_id: null },
      [item.id, 'flyttad', { from_id: item.holder_id, to_id: moveTo }],
    ).then(() => setMoveTo(''))

  const sell = () =>
    patch({ status: 'sald', sold_to: soldTo || null, lent_to_id: null }, [item.id, 'sald', { from_id: item.holder_id, note: soldTo || null }]).then(() =>
      setSoldTo(''),
    )

  async function saveEdit() {
    if (!draft) return
    const { image_path: _i, icon_path: _c, ...rest } = draft
    const ok = await patch(rest, [item!.id, 'redigerad', {}])
    if (ok) setEditing(false)
  }

  async function remove() {
    if (!confirm(`Ta bort "${item!.name}" permanent? Det går inte att ångra.`)) return
    setBusy(true)
    const { error } = await supabase.from('items').delete().eq('id', item!.id)
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    await deleteImages(item!.image_path, item!.icon_path)
    await reload()
    navigate('/')
  }

  async function fetchIcon() {
    if (!img) return
    setBusy(true)
    setError(null)
    try {
      const blob = await compressImage(await (await fetch(img)).blob())
      const parsed = await parseImage(blob)
      if (!parsed.icon_box) throw new Error('Hittade ingen ikon i bilden')
      const icon_path = await uploadImage(await cropIcon(blob, parsed.icon_box), '-icon')
      await supabase.from('items').update({ icon_path }).eq('id', item!.id)
      await deleteImages(item!.icon_path)
      await reload()
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  const img = imageUrl(item.image_path)
  const holder = charById(item.holder_id)
  const others = characters.filter((c) => c.id !== item.holder_id)

  return (
    <div className="page">
      <Link to="/" className="back">← Förrådet</Link>
      <div className="item-layout">
        <div className="item-layout__main">
          <ItemTooltip item={editing && draft ? draft : item} iconUrl={imageUrl(item.icon_path)} />
          {img && (
            <a href={img} target="_blank" rel="noreferrer" title="Öppna originalbild">
              <img className="shot" src={img} alt={`Screenshot av ${item.name}`} />
            </a>
          )}
        </div>

        <div className="item-layout__side">
          {error && <div className="alert">{error}</div>}

          {!editing && (
            <div className="panel">
              <h2 className="panel-title">Status</h2>
              <div className="card__meta">
                <HolderBadge item={item} />
                <StatusBadge item={item} />
                <NoDropBadge item={item} />
              </div>
              {item.notes && <p className="note">{item.notes}</p>}

              {item.status !== 'sald' && (
                <div className="quick">
                  {item.status === 'utlanad' ? (
                    <div className="quick__row">
                      <span>Utlånad till <b>{charById(item.lent_to_id)?.name ?? '?'}</b></span>
                      <button className="btn" disabled={busy} onClick={giveBack}>Tillbaka till {holder?.name ?? 'ägaren'}</button>
                    </div>
                  ) : (
                    <div className="quick__row">
                      <select value={lendTo} onChange={(e) => setLendTo(e.target.value)} disabled={isNoDrop(item)}>
                        <option value="">{isNoDrop(item) ? 'NODROP – kan inte lånas ut' : 'Låna ut till…'}</option>
                        {others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button className="btn" disabled={!lendTo || busy} onClick={lend}>Låna ut</button>
                    </div>
                  )}
                  <div className="quick__row">
                    <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                      <option value="">Flytta permanent till…</option>
                      {others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button className="btn" disabled={!moveTo || busy} onClick={move}>Flytta</button>
                  </div>
                  <div className="quick__row">
                    <input placeholder="Såld till / pris (valfritt)" value={soldTo} onChange={(e) => setSoldTo(e.target.value)} />
                    <button className="btn" disabled={busy} onClick={sell}>Markera såld</button>
                  </div>
                  <div className="quick__row">
                    {(['ledig', 'equippad'] as const).filter((s) => s !== item.status).map((s) => (
                      <button key={s} className="btn btn--ghost" disabled={busy}
                        onClick={() => patch({ status: s, lent_to_id: null }, [item.id, 'status', { note: STATUS_LABELS[s] }])}>
                        Markera {STATUS_LABELS[s].toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {item.status === 'sald' && (
                <button className="btn btn--ghost" disabled={busy}
                  onClick={() => patch({ status: 'ledig', sold_to: null }, [item.id, 'status', { note: 'Ångrade försäljning' }])}>
                  Ångra såld
                </button>
              )}
            </div>
          )}

          {editing && draft ? (
            <div className="panel">
              <h2 className="panel-title">Redigera</h2>
              <ItemFields draft={draft} onChange={setDraft} />
              <OwnershipFields draft={draft} onChange={setDraft} />
              <div className="actions">
                <button className="btn btn--primary" disabled={busy} onClick={saveEdit}>Spara</button>
                <button className="btn btn--ghost" onClick={() => setEditing(false)}>Avbryt</button>
              </div>
            </div>
          ) : (
            <div className="actions">
              <button className="btn" onClick={() => { setDraft({ ...item }); setEditing(true) }}>Redigera</button>
              {img && (
                <button className="btn btn--ghost" disabled={busy} onClick={fetchIcon}>
                  {item.icon_path ? 'Läs om ikonen' : 'Hämta ikon ur bilden'}
                </button>
              )}
              <button className="btn btn--danger" disabled={busy} onClick={remove}>Ta bort</button>
            </div>
          )}

          <div className="panel">
            <h2 className="panel-title">Historik</h2>
            {events.length === 0 && <small>Ingen historik.</small>}
            <ul className="history">
              {events.map((e) => (
                <li key={e.id}>
                  <time>{new Date(e.created_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}</time>
                  <span>
                    {EVENT_TEXT[e.kind] ?? e.kind}
                    {e.from_id && ` från ${charById(e.from_id)?.name ?? '?'}`}
                    {e.to_id && ` till ${charById(e.to_id)?.name ?? '?'}`}
                    {e.note && ` – ${e.note}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
