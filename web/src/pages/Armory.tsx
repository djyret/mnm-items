import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { WikiSearch } from '../components/Wiki'
import { BaseStatsPanel } from '../components/BaseStats'
import { baseFor } from '../lib/basestats'
import { SetBuilder } from '../components/SetBuilder'
import { MAX_SETS, asItem, putSetItem, putSetItems, removeSetItem, rowFromIndex, rowFromStash, rowFromWiki, useGearSets } from '../lib/gearsets'
import { fetchWikiItem } from '../lib/wiki'
import { StatusBadge } from '../components/Badges'
import { ClassIcon } from '../components/ClassIcon'
import { DollGrid, DollSlot } from '../components/Doll'
import { Icon } from '../components/Icon'
import { useItemHover } from '../components/ItemHover'
import { ItemIcon, ItemTooltip } from '../components/ItemTooltip'
import {
  EQUIP_SLOTS, canEquipOn, equipItem, equippedBy, fitsSlot, slotBase, slotLabel,
  unequipItem, useChapters, wearerOf,
} from '../lib/armory'
import { useAuth } from '../lib/auth'
import { CLASSES } from '../lib/constants'
import { BonusPanel } from '../components/GearStats'
import { useI18n } from '../lib/i18n'
import { canUse, compressImage, deleteImages, itemIconUrl, uploadImage } from '../lib/items'
import { useStore } from '../lib/store'
import { imageUrl, supabase } from '../lib/supabase'
import type { Character, Item, ItemEvent } from '../lib/types'

type Tab = 'equipped' | 'stash' | 'history'

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
  const { reload } = useStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [building, setBuilding] = useState(false)
  const [tab, setTab] = useState<Tab>('equipped')
  // 'now' = det karaktären har på sig, annars id för ett önskeset
  const [view, setView] = useState<string>('now')
  const [setError, setSetError] = useState<string | null>(null)
  const gear = useGearSets(char.id)
  const hover = useItemHover()
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

  async function savePoints(points: Record<string, number>) {
    const { error } = await supabase.from('characters').update({ stat_points: points }).eq('id', char.id)
    if (!error) await reload()
    return error?.message ?? null
  }

  const slotButton = (slot: string) => (
    <DollSlot key={slot} slot={slot} item={shown.get(slot)} selected={selected === slot} hover={hover}
      onSelect={() => setSelected(selected === slot ? null : slot)} />
  )

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
            <button type="button" className="btn btn--small" aria-pressed={building} onClick={() => setBuilding(!building)}>{t('builder.open')}</button>
            <button type="button" className="btn btn--small btn--ghost" onClick={renameSet}>{t('armory.sets.rename')}</button>
            <button type="button" className="btn btn--small btn--danger" onClick={deleteSet}>{t('common.delete')}</button>
          </span>
        )}
      </nav>
      {setError && <div className="alert">{setError}</div>}

      <div className="armory">
        <DollGrid className={activeSet ? 'doll--set' : ''} slot={slotButton} portrait={<Portrait char={char} />} />

        <div className="armory__side">
          {/* Stats först: rutan står still när slotpanelen under växer och krymper */}
          <BonusPanel worn={[...shown.values()]} compare={activeSet ? [...worn.values()] : undefined}
            base={baseFor(char.race, char.class, char.stat_points)} />
          <BaseStatsPanel race={char.race} cls={char.class} points={char.stat_points} editable={canEdit} onSave={savePoints} />
          {selected && activeSet && (
            <SetSlotPanel char={char} setId={activeSet.id} slot={selected} item={shown.get(selected) ?? null} items={items} onChange={gear.reload} />
          )}
          {selected && !activeSet && <SlotPanel char={char} slot={selected} item={worn.get(selected) ?? null} items={items} />}
          {!selected && <div className="panel armory__hint">{t(activeSet ? 'armory.sets.pickSlot' : 'armory.pickSlot')}</div>}
        </div>
      </div>

      {building && activeSet && canEdit && (
        <SetBuilder key={activeSet.id} cls={char.class} race={char.race} setName={activeSet.name} current={shown}
          onClose={() => setBuilding(false)}
          onApply={async (picks) => {
            const err = await putSetItems(activeSet.id, picks.map((p) => ({ slot: p.slot, row: rowFromIndex(p.item) })))
            await gear.reload()
            return err
          }} />
      )}

      <nav className="kr-tabs armory__tabs" aria-label={t('armory.tabsLabel')}>
        {(['equipped', 'stash', 'history'] as const).map((k) => (
          <button key={k} type="button" className={`kr-tab${tab === k ? ' active' : ''}`} aria-pressed={tab === k} onClick={() => setTab(k)}>
            {t(`armory.tab.${k}`)}
          </button>
        ))}
      </nav>
      {tab === 'equipped' && <EquippedList worn={worn} />}
      {tab === 'stash' && <StashList char={char} items={items} />}
      {tab === 'history' && <History char={char} />}
      {hover.tip}
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
  const hover = useItemHover()

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
      {hover.tip}
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
                <Link to={`/item/${i.id}`} {...hover.bind(i)}>{i.name}</Link>
                {i.equipped_slot &&<small>{t('armory.nowIn', { slot: slotLabel(i.equipped_slot) })}</small>}
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
                <Link to={`/item/${i.id}`} {...hover.bind(i)}>{i.name}</Link>
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
  const hover = useItemHover()

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
      {hover.tip}
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
                    <Link to={`/item/${i.id}`} {...hover.bind(i)}>{i.name}</Link>
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

// ---------- Flikar ----------

function EquippedList({ worn }: { worn: Map<string, Item> }) {
  const { t } = useI18n()
  const chapters = useChapters()
  const title = (cid: string | null) => chapters.find((c) => c.id === cid)
  const hover = useItemHover()
  if (worn.size === 0) return <div className="panel empty">{t('armory.nothingEquipped')}</div>
  return (
    <div className="panel">
      {hover.tip}
      <ul className="armory__list armory__list--wide">
        {EQUIP_SLOTS.filter((s) => worn.has(s)).map((s) => {
          const i = worn.get(s)!
          const ch = title(i.found_chapter_id)
          return (
            <li key={s}>
              <span className="armory__slotname">{slotLabel(s)}</span>
              <ItemIcon src={itemIconUrl(i)} slot={slotBase(s)} size="sm" />
              <Link to={`/item/${i.id}`} {...hover.bind(i)}>{i.name}</Link>
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
  const hover = useItemHover()
  if (list.length === 0) return <div className="panel empty">{t('armory.stashEmpty')}</div>
  return (
    <div className="panel">
      {hover.tip}
      <ul className="armory__list armory__list--wide">
        {list.map((i) => (
          <li key={i.id}>
            <ItemIcon src={itemIconUrl(i)} slot={i.slots[0]} size="sm" />
            <Link to={`/item/${i.id}`} {...hover.bind(i)}>{i.name}</Link>
            <StatusBadge item={i} />
          </li>
        ))}
      </ul>
      <Link className="btn btn--small" to={`/forrad?karaktar=${char.id}`}>{t('armory.openInStash')}</Link>
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
