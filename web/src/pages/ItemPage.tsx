import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { HolderBadge, StatusBadge } from '../components/Badges'
import { ItemFields, OwnershipFields } from '../components/ItemForm'
import { ItemTooltip } from '../components/ItemTooltip'
import { Money, PriceInput } from '../components/Money'
import { formatPrice } from '../lib/money'
import { EVENT_NOTES, STATUSES } from '../lib/constants'
import { compressImage, cropIcon, deleteImages, itemIconUrl, logEvent, parseImage, uploadImage } from '../lib/items'
import { useAuth } from '../lib/auth'
import { useI18n, type Key } from '../lib/i18n'
import { useStore } from '../lib/store'
import { imageUrl, supabase } from '../lib/supabase'
import type { Item, ItemDraft, ItemEvent } from '../lib/types'
import { Icon } from '../components/Icon'
import { WikiCredit, WikiSearch } from '../components/Wiki'
import { fetchWikiItem, fillEmpty, findExact, type WikiRef } from '../lib/wiki'
import { equipItem, slotLabel, slotsFor, unequipItem, useChapters, wearerOf } from '../lib/armory'

/** item_events.kind som har en text; okända koder visas som de är. */
const EVENT_KINDS = ['skapad', 'flyttad', 'utlanad', 'aterlamnad', 'sald', 'status', 'redigerad'] as const
type EventKind = (typeof EVENT_KINDS)[number]
const isEventKind = (k: string): k is EventKind => (EVENT_KINDS as readonly string[]).includes(k)

/** Fasta anteckningar (lagrade på svenska) översätts; fritext som köparnamn visas som den är. */
function eventNote(note: string, t: (key: Key, vars?: Record<string, string>) => string): string {
  const status = STATUSES.find((s) => EVENT_NOTES[s] === note)
  if (status) return t(`forradet.status.${status}`)
  if (note === EVENT_NOTES.guideRemoved) return t('forradet.note.guideRemoved')
  if (note === EVENT_NOTES.unsold) return t('forradet.note.unsold')
  if (note.startsWith(EVENT_NOTES.guideSet)) return t('forradet.note.guideSet', { price: note.slice(EVENT_NOTES.guideSet.length) })
  return note
}

export function ItemPage() {
  const { id } = useParams()
  const { items, characters, charById, reload, loading } = useStore()
  const chapters = useChapters()
  const [equipSlot, setEquipSlot] = useState('')
  const [wikiSearch, setWikiSearch] = useState(false)
  const navigate = useNavigate()
  const { canEdit, access } = useAuth()
  const { t, locale } = useI18n()
  const item = items.find((i) => i.id === id)
  const [events, setEvents] = useState<ItemEvent[]>([])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ItemDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [lendTo, setLendTo] = useState('')
  const [moveTo, setMoveTo] = useState('')
  const [soldTo, setSoldTo] = useState('')
  const [soldPrice, setSoldPrice] = useState<number | null>(null)
  const [guide, setGuide] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setGuide(item?.price_cp ?? null), [item?.price_cp])

  // Var itemet kommer ifrån, live från wikin (bara för medlemmar: nyckeln kräver inloggning)
  const [sources, setSources] = useState<Pick<WikiRef, 'droppedBy' | 'soldBy'> | null>(null)
  const wikiId = item?.wiki_id
  useEffect(() => {
    setSources(null)
    if (!wikiId || access === 'visitor') return
    let stale = false
    fetchWikiItem(wikiId)
      .then(({ wiki }) => { if (!stale) setSources({ droppedBy: wiki.droppedBy ?? [], soldBy: wiki.soldBy ?? [] }) })
      .catch(() => {})
    return () => { stale = true }
  }, [wikiId, access])

  // Vilka karaktärers önskeset itemet finns i (samma item eller samma wikisida)
  const [wishedBy, setWishedBy] = useState<string[]>([])
  useEffect(() => {
    setWishedBy([])
    if (!id) return
    let stale = false
    const filter = wikiId ? `item_id.eq.${id},wiki_id.eq.${wikiId}` : `item_id.eq.${id}`
    supabase
      .from('gear_set_items')
      .select('gear_sets(character_id)')
      .or(filter)
      .then(({ data }) => {
        if (stale || !data) return
        const ids = new Set((data as unknown as { gear_sets: { character_id: string } | null }[]).map((r) => r.gear_sets?.character_id))
        setWishedBy([...ids].map((c) => charById(c)?.name).filter((n): n is string => !!n))
      })
    return () => { stale = true }
  }, [id, wikiId, charById])

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
        <div className="panel empty">{loading ? t('common.loading') : <>{t('forradet.itemPage.notFound')} <Link to="/">{t('forradet.itemPage.toStash')}</Link></>}</div>
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
    patch(
      { status: 'sald', sold_to: soldTo || null, lent_to_id: null, sold_price_cp: soldPrice ?? item.price_cp },
      [item.id, 'sald', {
        from_id: item.holder_id,
        note: [soldTo, soldPrice ?? item.price_cp ? formatPrice(soldPrice ?? item.price_cp) : ''].filter(Boolean).join(' – ') || null,
      }],
    ).then(() => {
      setSoldTo('')
      setSoldPrice(null)
    })

  async function saveEdit() {
    if (!draft) return
    const { image_path: _i, icon_path: _c, ...rest } = draft
    const becameSold = rest.status === 'sald' && item!.status !== 'sald'
    const ok = await patch(
      rest,
      becameSold
        ? [item!.id, 'sald', { from_id: item!.holder_id, note: [rest.sold_to, (rest.sold_price_cp ?? rest.price_cp) ? formatPrice((rest.sold_price_cp ?? rest.price_cp)!) : ''].filter(Boolean).join(' – ') || null }]
        : [item!.id, 'redigerad', {}],
    )
    if (ok) setEditing(false)
  }

  async function remove() {
    if (!confirm(t('forradet.itemPage.deleteConfirm', { name: item!.name }))) return
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
      if (!parsed.icon_box) throw new Error(t('forradet.itemPage.noIcon'))
      const icon_path = await uploadImage(await cropIcon(blob, parsed.icon_box), '-icon')
      await supabase.from('items').update({ icon_path }).eq('id', item!.id)
      await deleteImages(item!.icon_path)
      await reload()
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  /** Länkar till wikin (känt id, exakt namn, annars sökruta) och fyller bara tomma fält. */
  async function linkWiki(id?: string) {
    setBusy(true)
    setError(null)
    try {
      const wikiId = id ?? item!.wiki_id ?? (await findExact(item!.name))?.id
      if (!wikiId) {
        setWikiSearch(true)
      } else {
        const { item: w, wiki } = await fetchWikiItem(wikiId)
        const ok = await patch(fillEmpty(item!, w, wiki), [item!.id, 'redigerad', { note: 'Monsters and Memories Wiki' }])
        if (ok) setWikiSearch(false)
      }
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  async function equipAction(fn: () => Promise<string | null>) {
    setBusy(true)
    setError(null)
    const err = await fn()
    if (err) setError(err)
    await reload()
    setBusy(false)
    setEquipSlot('')
  }

  const img = imageUrl(item.image_path)
  const holder = charById(item.holder_id)
  const others = characters.filter((c) => c.id !== item.holder_id)
  const wearer = charById(wearerOf(item))
  const fits = slotsFor(item)
  const canEquip = (item.status === 'ledig' || item.status === 'equippad' || item.status === 'utlanad') && !!wearer && fits.length > 0
  const foundIn = chapters.find((c) => c.id === item.found_chapter_id)

  return (
    <div className="page">
      <Link to="/" className="back"><Icon name="vanster" size={14} /> {t('nav.stash')}</Link>
      <div className="item-layout">
        <div className="item-layout__main">
          <ItemTooltip item={editing && draft ? draft : item} iconUrl={itemIconUrl(item)} />
          {img && (
            <a href={img} target="_blank" rel="noreferrer" title={t('forradet.itemPage.openOriginal')}>
              <img className="shot" src={img} alt={t('forradet.itemPage.screenshotOf', { name: item.name })} />
            </a>
          )}
        </div>

        <div className="item-layout__side">
          {error && <div className="alert">{error}</div>}

          {!editing && (
            <div className="panel">
              <h2 className="panel-title">{t('forradet.itemPage.status')}</h2>
              <div className="card__meta">
                <HolderBadge item={item} />
                <StatusBadge item={item} />
              </div>
              {item.status === 'sald' && (
                <p className="price-line">
                  {t('forradet.itemPage.soldFor')} {item.sold_price_cp != null ? <Money cp={item.sold_price_cp} /> : t('forradet.itemPage.noPrice')}
                  {item.price_cp != null && <span className="price-line__guide"> · {t('forradet.itemPage.guideInline')} <Money cp={item.price_cp} /></span>}
                </p>
              )}

              {!canEdit && item.status !== 'sald' && item.price_cp != null && (
                <p className="price-line">{t('forradet.itemPage.guide')} <Money cp={item.price_cp} /></p>
              )}
              {canEdit && <div className="guide">
                <span className="guide__label">{t('forradet.form.guidePrice')}</span>
                <div className="guide__row">
                  <PriceInput value={guide} onChange={setGuide} />
                  <button className="btn btn--small" disabled={busy || guide === item.price_cp}
                    onClick={() => patch({ price_cp: guide }, [item.id, 'redigerad', { note: guide == null ? EVENT_NOTES.guideRemoved : EVENT_NOTES.guideSet + formatPrice(guide) }])}>
                    {t('forradet.itemPage.saveGuide')}
                  </button>
                  {item.price_cp != null && (
                    <button className="btn btn--danger btn--small" disabled={busy}
                      onClick={() => patch({ price_cp: null }, [item.id, 'redigerad', { note: EVENT_NOTES.guideRemoved }])}>
                      {t('common.delete')}
                    </button>
                  )}
                </div>
              </div>}
              {item.notes && <p className="note">{item.notes}</p>}
              {item.equipped_slot && wearer && (
                <p className="item-equip">
                  <Link to={`/karaktar/${wearer.id}`}>{t('armory.item.wornBy', { name: wearer.name, slot: slotLabel(item.equipped_slot) })}</Link>
                </p>
              )}
              {foundIn && (
                <p className="item-equip">{t('armory.item.foundIn')} <Link to={`/kronikan/${foundIn.id}`}>{foundIn.title}</Link></p>
              )}
              {wishedBy.length > 0 && <p className="item-equip">{t('armory.item.wishedBy', { names: wishedBy.join(', ') })}</p>}

              {canEdit && item.status !== 'sald' && (
                <div className="quick">
                  {item.status === 'utlanad' ? (
                    <div className="quick__row">
                      <span>{t('forradet.itemPage.lentTo')} <b>{charById(item.lent_to_id)?.name ?? '?'}</b></span>
                      <button className="btn" disabled={busy} onClick={giveBack}>{t('forradet.itemPage.backTo', { name: holder?.name ?? t('forradet.itemPage.theOwner') })}</button>
                    </div>
                  ) : (
                    <div className="quick__row">
                      <select value={lendTo} onChange={(e) => setLendTo(e.target.value)}>
                        <option value="">{t('forradet.itemPage.lendTo')}</option>
                        {others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button className="btn" disabled={!lendTo || busy} onClick={lend}>{t('forradet.itemPage.lend')}</button>
                    </div>
                  )}
                  <div className="quick__row">
                    <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                      <option value="">{t('forradet.itemPage.moveTo')}</option>
                      {others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button className="btn" disabled={!moveTo || busy} onClick={move}>{t('forradet.itemPage.move')}</button>
                  </div>
                  <div className="quick__row quick__row--sell">
                    <span className="guide__label">
                      {item.price_cp != null ? t('forradet.itemPage.soldForBlankGuide') : t('forradet.form.soldFor')}
                    </span>
                    <PriceInput value={soldPrice} onChange={setSoldPrice} />
                    {soldPrice != null && item.price_cp != null && soldPrice < item.price_cp && (
                      <span className="warn price-warn">{t('forradet.itemPage.belowGuide', { price: formatPrice(item.price_cp) })}</span>
                    )}
                    <input placeholder={t('forradet.itemPage.soldToOptional')} value={soldTo} onChange={(e) => setSoldTo(e.target.value)} />
                    <button className="btn" disabled={busy} onClick={sell}>{t('forradet.itemPage.markSold')}</button>
                  </div>
                  {canEquip && (
                    <div className="quick__row">
                      <span>{t('armory.item.equipOn', { name: wearer!.name })}</span>
                      <select value={equipSlot} onChange={(e) => setEquipSlot(e.target.value)}>
                        <option value="">{t('forradet.form.choose')}</option>
                        {fits.map((s) => <option key={s} value={s}>{slotLabel(s)}</option>)}
                      </select>
                      <button className="btn" disabled={!equipSlot || busy} onClick={() => equipAction(() => equipItem(item.id, equipSlot))}>
                        {t('armory.equip')}
                      </button>
                      {item.equipped_slot && (
                        <button className="btn btn--ghost" disabled={busy} onClick={() => equipAction(() => unequipItem(item.id))}>
                          {t('armory.unequip')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {canEdit && item.status === 'sald' && (
                <button className="btn btn--ghost" disabled={busy}
                  onClick={() => patch({ status: 'ledig', sold_to: null, sold_price_cp: null }, [item.id, 'status', { note: EVENT_NOTES.unsold }])}>
                  {t('forradet.itemPage.undoSold')}
                </button>
              )}
            </div>
          )}

          {!editing && (item.wiki_url || canEdit) && (
            <div className="panel">
              <h2 className="panel-title">{t('wiki.title')}</h2>
              {item.wiki_url && (
                <p className="wiki-linked">
                  <a href={item.wiki_url} target="_blank" rel="noreferrer">{t('wiki.openItem', { name: item.name })}</a>
                </p>
              )}
              {sources && (['droppedBy', 'soldBy'] as const).map((k) => sources[k]!.length > 0 && (
                <div key={k}>
                  <b>{t(`wiki.${k}`)}</b>
                  <ul className="wiki-sources">
                    {sources[k]!.map((s) => (
                      <li key={`${s.zone}-${s.npc}`}>
                        {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.npc}</a> : s.npc}
                        {s.zone && <small> · {s.zone}</small>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {canEdit && (
                <div className="actions">
                  <button className="btn btn--small" disabled={busy} onClick={() => linkWiki()}>
                    {item.wiki_id ? t('wiki.fillEmpty') : t('wiki.link')}
                  </button>
                </div>
              )}
              {canEdit && wikiSearch && <WikiSearch initial={item.name} busy={busy} onPick={(h) => linkWiki(h.id)} />}
              {!wikiSearch && <WikiCredit />}
            </div>
          )}

          {editing && draft ? (
            <div className="panel">
              <h2 className="panel-title">{t('common.edit')}</h2>
              <ItemFields draft={draft} onChange={setDraft} />
              <OwnershipFields draft={draft} onChange={setDraft} />
              <div className="actions">
                <button className="btn btn--primary" disabled={busy} onClick={saveEdit}>{t('common.save')}</button>
                <button className="btn btn--ghost" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
              </div>
            </div>
          ) : canEdit && (
            <div className="actions">
              <button className="btn" onClick={() => { setDraft({ ...item }); setEditing(true) }}>{t('common.edit')}</button>
              {img && (
                <button className="btn btn--ghost" disabled={busy} onClick={fetchIcon}>
                  {item.icon_path ? t('forradet.itemPage.rereadIcon') : t('forradet.itemPage.fetchIcon')}
                </button>
              )}
              <button className="btn btn--danger" disabled={busy} onClick={remove}>{t('common.delete')}</button>
            </div>
          )}

          <div className="panel">
            <h2 className="panel-title">{t('forradet.history.title')}</h2>
            {events.length === 0 && <small>{t('forradet.history.empty')}</small>}
            <ul className="history">
              {events.map((e) => (
                <li key={e.id}>
                  <time>{new Date(e.created_at).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}</time>
                  <span>
                    {e.kind === 'utrustad' || e.kind === 'avtagen' ? (
                      <>
                        {t(e.kind === 'utrustad' ? 'armory.history.on' : 'armory.history.off')}
                        {' – '}{charById(e.to_id ?? e.from_id)?.name ?? '?'}
                        {e.note && ` (${slotLabel(e.note)})`}
                        {e.level != null && ` · Level ${e.level}`}
                      </>
                    ) : (
                      <>
                        {isEventKind(e.kind) ? t(`forradet.event.${e.kind}`) : e.kind}
                        {e.from_id && ` ${t('forradet.history.from', { name: charById(e.from_id)?.name ?? '?' })}`}
                        {e.to_id && ` ${t('forradet.history.to', { name: charById(e.to_id)?.name ?? '?' })}`}
                        {e.note && ` – ${eventNote(e.note, t)}`}
                      </>
                    )}
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
