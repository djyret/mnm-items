import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { WikiSearch } from '../components/Wiki'
import { MAX_SETS, asItem, putSetItem, removeSetItem, rowFromStash, rowFromWiki, useGearSets } from '../lib/gearsets'
import { fetchWikiItem } from '../lib/wiki'
import { StatusBadge } from '../components/Badges'
import { ClassIcon } from '../components/ClassIcon'
import { Icon } from '../components/Icon'
import { ItemIcon, ItemTooltip } from '../components/ItemTooltip'
import {
  DOLL, EQUIP_SLOTS, canEquipOn, equipItem, equippedBy, fitsSlot, sameName, slotBase, slotLabel,
  unequipItem, useChapters, wearerOf,
} from '../lib/armory'
import { useAuth } from '../lib/auth'
import { CLASSES, SLOTS, statHelp } from '../lib/constants'
import { useI18n } from '../lib/i18n'
import { canUse, compressImage, deleteImages, itemIconUrl, uploadImage } from '../lib/items'
import { useStore } from '../lib/store'
import { imageUrl, supabase } from '../lib/supabase'
import type { Character, Item, ItemEvent, WishlistItem } from '../lib/types'

type Tab = 'equipped' | 'stash' | 'wishlist' | 'history'

export function Armory() {
  const { id } = useParams()
  const { characters, items, loading } = useStore()
  const { t } = useI18n()
  const char = characters.find((c) => c.id === id)

  if (!char) {
    return (
      <div className="page">
        <div className="panel empty">
          {loading ? t('common.loading') : <>{t('armory.notFound')} <Link to="/karaktarer">{t('armory.toCharacters')}</Link></>}
        </div>
      </div>
    )
  }
  return <ArmoryFor char={char} items={items} />
}

function ArmoryFor({ char, items }: { char: Character; items: Item[] }) {
  const { t } = useI18n()
  const { canEdit } = useAuth()
  const [selected, setSelected] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('equipped')
  // 'now' = det karaktären har på sig, annars id för ett önskeset
  const [view, setView] = useState<string>('now')
  const [setError, setSetError] = useState<string | null>(null)
  const gear = useGearSets(char.id)
  const worn = useMemo(() => equippedBy(items, char.id), [items, char.id])
  const activeSet = gear.sets.find((s) => s.id === view) ?? null
  const shown = useMemo(() => {
    if (!activeSet) return worn
    return new Map(gear.rows.filter((r) => r.set_id === activeSet.id).map((r) => [r.slot, asItem(r)]))
  }, [activeSet, gear.rows, worn])

  async function addSet() {
    setSetError(null)
    const name = t('armory.sets.defaultName', { n: gear.sets.length + 1 })
    const { data, error } = await supabase.from('gear_sets')
      .insert({ character_id: char.id, name, position: gear.sets.length }).select('id').single()
    if (error) return setSetError(error.message)
    await gear.reload()
    setView(data.id)
  }

  async function renameSet() {
    if (!activeSet) return
    const name = prompt(t('armory.sets.renamePrompt'), activeSet.name)?.trim()
    if (!name || name === activeSet.name) return
    const { error } = await supabase.from('gear_sets').update({ name }).eq('id', activeSet.id)
    if (error) setSetError(error.message)
    await gear.reload()
  }

  async function deleteSet() {
    if (!activeSet || !confirm(t('armory.sets.deleteConfirm', { name: activeSet.name }))) return
    const { error } = await supabase.from('gear_sets').delete().eq('id', activeSet.id)
    if (error) setSetError(error.message)
    setView('now')
    await gear.reload()
  }

  const slotButton = (slot: string) => {
    const item = shown.get(slot)
    return (
      <button
        key={slot}
        type="button"
        className={`doll__slot${item ? ' doll__slot--filled' : ''}${selected === slot ? ' doll__slot--selected' : ''}`}
        aria-pressed={selected === slot}
        title={item ? `${slotLabel(slot)}: ${item.name}` : slotLabel(slot)}
        onClick={() => setSelected(selected === slot ? null : slot)}
      >
        <ItemIcon src={item ? itemIconUrl(item) : null} slot={slotBase(slot)} size="sm" />
        <span className="doll__label">{item ? item.name : slotLabel(slot)}</span>
      </button>
    )
  }

  return (
    <div className="page">
      <Link to="/karaktarer" className="back"><Icon name="vanster" size={14} /> {t('nav.characters')}</Link>
      <header className="armory__head">
        <ClassIcon code={char.class} size={56} />
        <div>
          <h1 className="page-title armory__name">
            {char.name} {char.is_main && <span className="badge badge--main">Main</span>}
          </h1>
          <div className="char__info">
            {[char.level && `Level ${char.level}`, char.race, char.class && (CLASSES[char.class] || char.class)].filter(Boolean).join(' · ') || t('forradet.chars.noInfo')}
            {char.player && <> · {t('forradet.chars.playedBy', { player: char.player })}</>}
          </div>
        </div>
      </header>

      {/* Flikarna ligger ovanför båda kolumnerna så att dockan och statsrutan börjar i samma höjd */}
      <nav className="kr-tabs armory__sets" aria-label={t('armory.sets.label')}>
        <button type="button" className={`kr-tab${view === 'now' ? ' active' : ''}`} aria-pressed={view === 'now'}
          onClick={() => { setView('now'); setSelected(null) }}>
          {t('armory.sets.now')}
        </button>
        {gear.sets.map((s) => (
          <button key={s.id} type="button" className={`kr-tab${view === s.id ? ' active' : ''}`} aria-pressed={view === s.id}
            onClick={() => { setView(s.id); setSelected(null) }}
            onDoubleClick={() => canEdit && view === s.id && renameSet()}>
            {s.name}
          </button>
        ))}
        {canEdit && gear.sets.length < MAX_SETS && (
          <button type="button" className="kr-tab armory__addset" onClick={addSet} title={t('armory.sets.addHint')}>+ {t('armory.sets.add')}</button>
        )}
        {canEdit && activeSet && (
          <span className="armory__setactions">
            <button type="button" className="btn btn--small btn--ghost" onClick={renameSet}>{t('armory.sets.rename')}</button>
            <button type="button" className="btn btn--small btn--danger" onClick={deleteSet}>{t('common.delete')}</button>
          </span>
        )}
      </nav>
      {setError && <div className="alert">{setError}</div>}

      <div className="armory">
        <div className={`panel doll${activeSet ? ' doll--set' : ''}`}>
          <div className="doll__row doll__row--top">{DOLL.top.map(slotButton)}</div>
          <div className="doll__col doll__col--left">{DOLL.left.map(slotButton)}</div>
          <Portrait char={char} />
          <div className="doll__col doll__col--right">{DOLL.right.map(slotButton)}</div>
          <div className="doll__row doll__row--bottom">{DOLL.bottom.map(slotButton)}</div>
        </div>

        <div className="armory__side">
          {/* Stats först: rutan står still när slotpanelen under växer och krymper */}
          <BonusPanel worn={[...shown.values()]} compare={activeSet ? [...worn.values()] : undefined} />
          {selected && activeSet && (
            <SetSlotPanel char={char} setId={activeSet.id} slot={selected} item={shown.get(selected) ?? null} items={items} onChange={gear.reload} />
          )}
          {selected && !activeSet && <SlotPanel char={char} slot={selected} item={worn.get(selected) ?? null} items={items} />}
          {!selected && <div className="panel armory__hint">{t(activeSet ? 'armory.sets.pickSlot' : 'armory.pickSlot')}</div>}
        </div>
      </div>

      <nav className="kr-tabs armory__tabs" aria-label={t('armory.tabsLabel')}>
        {(['equipped', 'stash', 'wishlist', 'history'] as const).map((k) => (
          <button key={k} type="button" className={`kr-tab${tab === k ? ' active' : ''}`} aria-pressed={tab === k} onClick={() => setTab(k)}>
            {t(`armory.tab.${k}`)}
          </button>
        ))}
      </nav>
      {tab === 'equipped' && <EquippedList worn={worn} />}
      {tab === 'stash' && <StashList char={char} items={items} />}
      {tab === 'wishlist' && <Wishlist char={char} />}
      {tab === 'history' && <History char={char} />}
    </div>
  )
}

// ---------- Porträtt ----------

function Portrait({ char }: { char: Character }) {
  const { canEdit } = useAuth()
  const { reload } = useStore()
  const { t } = useI18n()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const src = imageUrl(char.portrait_path)

  async function upload(file: File) {
    if (!file.type.startsWith('image/')) return
    setBusy(true)
    setError(null)
    try {
      const path = await uploadImage(await compressImage(file, 900), '-portrait')
      const { error } = await supabase.from('characters').update({ portrait_path: path }).eq('id', char.id)
      if (error) {
        await deleteImages(path)
        throw error
      }
      await deleteImages(char.portrait_path)
      await reload()
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  return (
    <figure className="doll__portrait">
      {src
        ? <img src={src} alt={t('armory.portraitOf', { name: char.name })} />
        : <div className="doll__noportrait"><ClassIcon code={char.class} size={96} /><span>{t('armory.noPortrait')}</span></div>}
      {canEdit && (
        <>
          <button type="button" className="btn btn--small doll__upload" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? t('armory.uploading') : src ? t('armory.changePortrait') : t('armory.addPortrait')}
          </button>
          <input ref={input} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </>
      )}
      {error && <div className="alert">{error}</div>}
    </figure>
  )
}

// ---------- Vald slot ----------

function SlotPanel({ char, slot, item, items }: { char: Character; slot: string; item: Item | null; items: Item[] }) {
  const { canEdit } = useAuth()
  const { reload, charById } = useStore()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ägda eller lånade items med känd slot som passar här
  const own = items.filter((i) => i.id !== item?.id && i.slots.length > 0 && fitsSlot(i, slot) && canEquipOn(i, char.id))
  // Lediga items hos andra som karaktären kan bära (att låna)
  const others = items.filter((i) =>
    i.status === 'ledig' && i.holder_id !== char.id && i.slots.length > 0 && fitsSlot(i, slot) && canUse(i, char))

  async function run(fn: () => Promise<string | null>) {
    setBusy(true)
    setError(null)
    const err = await fn()
    if (err) setError(err)
    await reload()
    setBusy(false)
  }

  return (
    <div className="panel">
      <h2 className="panel-title">{slotLabel(slot)}</h2>
      {error && <div className="alert">{error}</div>}
      {item ? (
        <>
          <Link to={`/item/${item.id}`} className="armory__tooltip"><ItemTooltip item={item} compact iconUrl={itemIconUrl(item)} /></Link>
          {item.status === 'utlanad' && (
            <p className="note">{t('armory.borrowedFrom', { name: charById(item.holder_id)?.name ?? '?' })}</p>
          )}
          <div className="actions">
            <Link className="btn btn--small" to={`/item/${item.id}`}>{t('armory.openItem')}</Link>
            {canEdit && <button className="btn btn--small btn--ghost" disabled={busy} onClick={() => run(() => unequipItem(item.id))}>{t('armory.unequip')}</button>}
          </div>
        </>
      ) : (
        <p className="armory__empty">{t('armory.emptySlot')}</p>
      )}

      {canEdit && own.length > 0 && (
        <>
          <h3 className="armory__sub">{item ? t('armory.swapFor') : t('armory.putOn')}</h3>
          <ul className="armory__list">
            {own.map((i) => (
              <li key={i.id}>
                <ItemIcon src={itemIconUrl(i)} slot={i.slots[0]} size="sm" />
                <Link to={`/item/${i.id}`}>{i.name}</Link>
                {i.equipped_slot && <small>{t('armory.nowIn', { slot: slotLabel(i.equipped_slot) })}</small>}
                <button className="btn btn--small" disabled={busy} onClick={() => run(() => equipItem(i.id, slot))}>{t('armory.equip')}</button>
              </li>
            ))}
          </ul>
        </>
      )}
      {canEdit && (
        <div className="actions">
          <Link className="btn btn--small btn--primary" to={`/ny?karaktar=${char.id}&slot=${slot}`}>{t('armory.addNew')}</Link>
        </div>
      )}
      {canEdit && (
        <>
          <h3 className="armory__sub">{t('wiki.inSlot')}</h3>
          {/* key: ny sökruta per slot så att förra sökningen inte hänger kvar */}
          <WikiSearch key={slot} slot={slot}
            onPick={(h) => navigate(`/ny?karaktar=${char.id}&slot=${slot}&wiki=${encodeURIComponent(h.id)}`)} />
        </>
      )}

      {others.length > 0 && (
        <>
          <h3 className="armory__sub">{t('armory.inStash')}</h3>
          <ul className="armory__list">
            {others.slice(0, 6).map((i) => (
              <li key={i.id}>
                <ItemIcon src={itemIconUrl(i)} slot={i.slots[0]} size="sm" />
                <Link to={`/item/${i.id}`}>{i.name}</Link>
                <small>{t('armory.heldBy', { name: charById(i.holder_id)?.name ?? '?' })}</small>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

// ---------- Slot i ett önskeset ----------

function SetSlotPanel({ char, setId, slot, item, items, onChange }: {
  char: Character
  setId: string
  slot: string
  item: Item | null
  items: Item[]
  onChange: () => Promise<void>
}) {
  const { canEdit } = useAuth()
  const { charById } = useStore()
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Förrådets items som passar slotten och som karaktären kan bära
  const stash = items.filter((i) => i.status !== 'sald' && i.slots.length > 0 && fitsSlot(i, slot) && canUse(i, char))

  async function run(fn: () => Promise<string | null>) {
    setBusy(true)
    setError(null)
    try {
      const err = await fn()
      if (err) setError(err)
    } catch (e) {
      setError((e as Error).message)
    }
    await onChange()
    setBusy(false)
  }

  const fromWiki = (wikiId: string) => run(async () => {
    const { item: w, wiki } = await fetchWikiItem(wikiId)
    return putSetItem(setId, slot, rowFromWiki(w, wiki))
  })

  return (
    <div className="panel">
      <h2 className="panel-title">{slotLabel(slot)}</h2>
      {error && <div className="alert">{error}</div>}
      {item ? (
        <>
          <div className="armory__tooltip"><ItemTooltip item={item} compact iconUrl={itemIconUrl(item)} /></div>
          {item.classes.length > 0 && char.class && !canUse(item, char) && <p className="warn">{t('armory.sets.cantUse', { name: char.name })}</p>}
          <div className="actions">
            {item.wiki_url && <a className="btn btn--small" href={item.wiki_url} target="_blank" rel="noreferrer">{t('wiki.open')}</a>}
            {canEdit && <button className="btn btn--small btn--ghost" disabled={busy} onClick={() => run(() => removeSetItem(setId, slot))}>{t('armory.sets.remove')}</button>}
          </div>
        </>
      ) : (
        <p className="armory__empty">{t('armory.emptySlot')}</p>
      )}

      {canEdit && (
        <>
          <h3 className="armory__sub">{t('armory.sets.fromWiki')}</h3>
          <WikiSearch key={slot} slot={slot} busy={busy} onPick={(h) => fromWiki(h.id)} />
          {stash.length > 0 && (
            <>
              <h3 className="armory__sub">{t('armory.sets.fromStash')}</h3>
              <ul className="armory__list">
                {stash.slice(0, 8).map((i) => (
                  <li key={i.id}>
                    <ItemIcon src={itemIconUrl(i)} slot={i.slots[0]} size="sm" />
                    <Link to={`/item/${i.id}`}>{i.name}</Link>
                    <small>{t('armory.heldBy', { name: charById(i.holder_id)?.name ?? '?' })}</small>
                    <button className="btn btn--small" disabled={busy} onClick={() => run(() => putSetItem(setId, slot, rowFromStash(i)))}>{t('armory.sets.put')}</button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ---------- Summa av utrustningen ----------

// Samma uppställning som spelets karaktärsfönster: två kolumner per block
const VITALS = ['HP', 'MANA', 'END', 'AC'] as const
const ATTRS = [['STR', 'STA', 'AGI', 'DEX'], ['INT', 'WIS', 'CHA']] as const
const RESISTS = [['SV_COLD', 'SV_CORRUPTION', 'SV_DISEASE', 'SV_ELEC'], ['SV_FIRE', 'SV_HOLY', 'SV_MAGIC', 'SV_POISON']] as const
const SHORT: Record<string, string> = {
  SV_COLD: 'Cold', SV_CORRUPTION: 'Corr', SV_DISEASE: 'Dis', SV_ELEC: 'Elec',
  SV_FIRE: 'Fire', SV_HOLY: 'Holy', SV_MAGIC: 'Mag', SV_POISON: 'Poi',
  HP: 'Health', MANA: 'Mana', END: 'Endurance', AC: 'Armor Class',
}

function sumStats(worn: Item[]): Record<string, number> {
  const totals: Record<string, number> = { AC: worn.reduce((s, i) => s + (i.ac ?? 0), 0) }
  for (const i of worn) {
    // Enchanten står skild från grundstatsen i spelet och läggs ovanpå
    for (const [k, v] of [...Object.entries(i.stats), ...Object.entries(i.enchant_stats ?? {})]) totals[k] = (totals[k] ?? 0) + v
  }
  return totals
}

/** Statsrutan. Med compare (önskeset) visas skillnaden mot det karaktären har på sig nu. */
function BonusPanel({ worn, compare }: { worn: Item[]; compare?: Item[] }) {
  const { t, lang } = useI18n()
  const totals = sumStats(worn)
  const base = compare ? sumStats(compare) : null
  const cell = (k: string) => {
    const v = totals[k] ?? 0
    const diff = base ? v - (base[k] ?? 0) : 0
    return (
      <div key={k} className="gstats__row" title={statHelp(k, lang)}>
        <dt>{SHORT[k] ?? k}</dt>
        <dd className={v > 0 ? 'gstats__up' : v < 0 ? 'gstats__down' : undefined}>
          {diff !== 0 && <small className={`gstats__diff ${diff > 0 ? 'gstats__up' : 'gstats__down'}`}>{diff > 0 ? `+${diff}` : diff}</small>}
          {v}
        </dd>
      </div>
    )
  }
  return (
    <div className="panel gstats">
      <dl className="gstats__vitals">{VITALS.map(cell)}</dl>
      <h2 className="gstats__head">{t('armory.stats')}</h2>
      <div className="gstats__grid">{ATTRS.map((col) => <dl key={col[0]}>{col.map(cell)}</dl>)}</div>
      <h2 className="gstats__head">{t('armory.resists')}</h2>
      <div className="gstats__grid">{RESISTS.map((col) => <dl key={col[0]}>{col.map(cell)}</dl>)}</div>
      <small className="bonus__note">{t(compare ? 'armory.sets.bonusNote' : 'armory.bonusNote', { count: worn.length })}</small>
    </div>
  )
}

// ---------- Flikar ----------

function EquippedList({ worn }: { worn: Map<string, Item> }) {
  const { t } = useI18n()
  const chapters = useChapters()
  const title = (cid: string | null) => chapters.find((c) => c.id === cid)
  if (worn.size === 0) return <div className="panel empty">{t('armory.nothingEquipped')}</div>
  return (
    <div className="panel">
      <ul className="armory__list armory__list--wide">
        {EQUIP_SLOTS.filter((s) => worn.has(s)).map((s) => {
          const i = worn.get(s)!
          const ch = title(i.found_chapter_id)
          return (
            <li key={s}>
              <span className="armory__slotname">{slotLabel(s)}</span>
              <ItemIcon src={itemIconUrl(i)} slot={slotBase(s)} size="sm" />
              <Link to={`/item/${i.id}`}>{i.name}</Link>
              {ch && <small><Link to={`/kronikan/${ch.id}`}>{t('armory.foundIn', { title: ch.title })}</Link></small>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function StashList({ char, items }: { char: Character; items: Item[] }) {
  const { t } = useI18n()
  const list = items.filter((i) =>
    i.status !== 'sald' && !(i.equipped_slot && wearerOf(i) === char.id) &&
    (i.holder_id === char.id || (i.status === 'utlanad' && i.lent_to_id === char.id)))
  if (list.length === 0) return <div className="panel empty">{t('armory.stashEmpty')}</div>
  return (
    <div className="panel">
      <ul className="armory__list armory__list--wide">
        {list.map((i) => (
          <li key={i.id}>
            <ItemIcon src={itemIconUrl(i)} slot={i.slots[0]} size="sm" />
            <Link to={`/item/${i.id}`}>{i.name}</Link>
            <StatusBadge item={i} />
          </li>
        ))}
      </ul>
      <Link className="btn btn--small" to={`/?karaktar=${char.id}`}>{t('armory.openInStash')}</Link>
    </div>
  )
}

function Wishlist({ char }: { char: Character }) {
  const { canEdit } = useAuth()
  const { wishlist, items, reload, charById } = useStore()
  const { t, locale } = useI18n()
  const [name, setName] = useState('')
  const [slot, setSlot] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mine = wishlist.filter((w) => w.character_id === char.id)
    .sort((a, b) => Number(!!a.fulfilled_at) - Number(!!b.fulfilled_at))

  async function run(q: PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true)
    setError(null)
    const { error } = await q
    if (error) setError(error.message)
    await reload()
    setBusy(false)
    return !error
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const ok = await run(supabase.from('wishlist').insert({ character_id: char.id, name: name.trim(), slot: slot || null, note: note.trim() || null }))
    if (ok) {
      setName('')
      setSlot('')
      setNote('')
    }
  }

  const matches = (w: WishlistItem) =>
    items.filter((i) => i.status !== 'sald' && sameName(i.name, w.name) && wearerOf(i) !== char.id)

  return (
    <div className="panel">
      {error && <div className="alert">{error}</div>}
      {mine.length === 0 && <p className="armory__empty">{t('armory.wish.empty')}</p>}
      <ul className="armory__list armory__list--wide">
        {mine.map((w) => (
          <li key={w.id} className={w.fulfilled_at ? 'armory__done' : undefined}>
            <span className="armory__slotname">{w.slot ? slotLabel(w.slot) : '–'}</span>
            <b>{w.name}</b>
            {w.note && <small>{w.note}</small>}
            {w.fulfilled_at
              ? <small>{t('armory.wish.gotIt', { date: new Date(w.fulfilled_at).toLocaleDateString(locale) })}</small>
              : matches(w).map((i) => (
                <small key={i.id}><Link to={`/item/${i.id}`}>{t('armory.wish.inStash', { name: charById(i.holder_id)?.name ?? '?' })}</Link></small>
              ))}
            {canEdit && (
              <span className="armory__rowactions">
                {!w.fulfilled_at && (
                  <button className="btn btn--small btn--ghost" disabled={busy}
                    onClick={() => run(supabase.from('wishlist').update({ fulfilled_at: new Date().toISOString() }).eq('id', w.id))}>
                    {t('armory.wish.markGot')}
                  </button>
                )}
                <button className="btn btn--small btn--danger" disabled={busy}
                  onClick={() => confirm(t('armory.wish.deleteConfirm', { name: w.name })) && run(supabase.from('wishlist').delete().eq('id', w.id))}>
                  {t('common.delete')}
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <form className="form armory__wishform" onSubmit={add}>
          <label className="field"><span>{t('armory.wish.name')}</span><input required value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field">
            <span>{t('armory.wish.slot')}</span>
            <select value={slot} onChange={(e) => setSlot(e.target.value)}>
              <option value="">{t('armory.wish.anySlot')}</option>
              {SLOTS.map((s) => <option key={s} value={s}>{slotLabel(s)}</option>)}
            </select>
          </label>
          <label className="field field--wide"><span>{t('armory.wish.note')}</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('armory.wish.notePlaceholder')} /></label>
          <div className="actions field--wide"><button className="btn btn--primary" disabled={busy}>{t('armory.wish.add')}</button></div>
        </form>
      )}
    </div>
  )
}

function History({ char }: { char: Character }) {
  const { items } = useStore()
  const { t, locale } = useI18n()
  const [events, setEvents] = useState<ItemEvent[] | null>(null)

  useEffect(() => {
    supabase
      .from('item_events')
      .select('*')
      .in('kind', ['utrustad', 'avtagen'])
      .or(`to_id.eq.${char.id},from_id.eq.${char.id}`)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setEvents((data as ItemEvent[]) ?? []))
  }, [char.id, items])

  if (events === null) return <div className="panel empty">{t('common.loading')}</div>
  if (events.length === 0) return <div className="panel empty">{t('armory.history.empty')}</div>
  const nameOf = (id: string) => items.find((i) => i.id === id)
  return (
    <div className="panel">
      <ul className="history">
        {events.map((e) => {
          const it = nameOf(e.item_id)
          return (
            <li key={e.id}>
              <time>{new Date(e.created_at).toLocaleDateString(locale)}</time>
              <span>
                {t(e.kind === 'utrustad' ? 'armory.history.on' : 'armory.history.off')}{' '}
                {it ? <Link to={`/item/${it.id}`}>{it.name}</Link> : '?'}
                {e.note && ` (${slotLabel(e.note)})`}
                {e.level != null && ` · Level ${e.level}`}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
