// Armory för en gästkaraktär: samma karaktärsfönster som gängets, men "Nu" och önskeseten är egna
// rader (guest_set_items) som fylls från wikin eller en avläst skärmdump. Förrådet syns aldrig här.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ClassIcon } from '../components/ClassIcon'
import { DollGrid, DollSlot } from '../components/Doll'
import { BonusPanel } from '../components/GearStats'
import { Icon } from '../components/Icon'
import { useItemHover } from '../components/ItemHover'
import { ItemTooltip } from '../components/ItemTooltip'
import { WikiSearch } from '../components/Wiki'
import { fitsSlot, slotLabel } from '../lib/armory'
import { useAuth } from '../lib/auth'
import {
  MAX_GUEST_WISHES, asGuestItem, guestInfo, putGuestItem, removeGuestItem, rowFromScreenshot, rowFromWiki,
  useGuestCharacters, useGuestGear, type GuestCharacter, type GuestSet,
} from '../lib/guests'
import { useI18n } from '../lib/i18n'
import { canUse, itemIconUrl } from '../lib/items'
import { supabase } from '../lib/supabase'
import type { Item } from '../lib/types'
import { fetchWikiItem } from '../lib/wiki'

export function GastArmory() {
  const { id } = useParams()
  const { session, isAdmin, canUseArmory, loading, signIn } = useAuth()
  const { list } = useGuestCharacters()
  const { t } = useI18n()

  if (loading) return null
  if (!canUseArmory) {
    return (
      <div className="page">
        <div className="panel empty">
          <p>{t('gaster.closed')}</p>
          {!session && <button className="btn btn--primary" onClick={() => signIn()}>{t('account.signIn')}</button>}
        </div>
      </div>
    )
  }
  const char = list?.find((c) => c.id === id)
  if (!char) {
    return (
      <div className="page">
        <div className="panel empty">
          {list === null ? t('common.loading') : <>{t('gaster.notFound')} <Link to="/gaster">{t('gaster.title')}</Link></>}
        </div>
      </div>
    )
  }
  return <GuestArmoryFor key={char.id} char={char} editable={char.owner_id === session?.user.id || isAdmin} />
}

function GuestArmoryFor({ char, editable }: { char: GuestCharacter; editable: boolean }) {
  const { t } = useI18n()
  const gear = useGuestGear(char.id)
  const hover = useItemHover()
  // null = "Nu", annars id för ett önskeset
  const [view, setView] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const nowSet = gear.sets.find((s) => s.kind === 'now') ?? null
  const wishes = gear.sets.filter((s) => s.kind === 'wish')
  const wish = wishes.find((s) => s.id === view) ?? null
  const active = wish ?? nowSet

  // Högst 5 set à 21 slots: billigt att räkna om vid varje rendering
  const itemsOf = (setId: string | undefined) =>
    new Map<string, Item>(gear.rows.filter((r) => r.set_id === setId).map((r) => [r.slot, asGuestItem(r)]))
  const now = itemsOf(nowSet?.id)
  const shown = wish ? itemsOf(wish.id) : now

  // Saknas "Nu" (skapas annars ihop med karaktären) lägger ägaren till det när sidan öppnas
  const { loaded, reload } = gear
  useEffect(() => {
    if (!editable || !loaded || nowSet) return
    supabase.from('guest_sets').insert({ guest_id: char.id, kind: 'now', name: 'Nu', position: 0 }).then(() => reload())
  }, [editable, loaded, nowSet, char.id, reload])

  async function addSet() {
    setError(null)
    const { data, error } = await supabase.from('guest_sets')
      .insert({ guest_id: char.id, kind: 'wish', name: t('armory.sets.defaultName', { n: wishes.length + 1 }), position: wishes.length + 1 })
      .select('id').single()
    if (error) return setError(error.message)
    await gear.reload()
    setView(data.id)
    setSelected(null)
  }

  async function renameSet() {
    if (!wish) return
    const name = prompt(t('armory.sets.renamePrompt'), wish.name)?.trim().slice(0, 40)
    if (!name || name === wish.name) return
    const { error } = await supabase.from('guest_sets').update({ name }).eq('id', wish.id)
    if (error) setError(error.message)
    await gear.reload()
  }

  async function deleteSet() {
    if (!wish || !confirm(t('armory.sets.deleteConfirm', { name: wish.name }))) return
    const { error } = await supabase.from('guest_sets').delete().eq('id', wish.id)
    if (error) setError(error.message)
    setView(null)
    setSelected(null)
    await gear.reload()
  }

  const show = (id: string | null) => {
    setView(id)
    setSelected(null)
  }

  return (
    <div className="page">
      <Link to="/gaster" className="back"><Icon name="vanster" size={14} /> {t('gaster.title')}</Link>
      <header className="armory__head">
        <ClassIcon code={char.class} size={56} />
        <div>
          <h1 className="page-title armory__name">{char.name}</h1>
          <div className="char__info">{guestInfo(char) || t('forradet.chars.noInfo')}</div>
        </div>
      </header>

      <nav className="kr-tabs armory__sets" aria-label={t('armory.sets.label')}>
        <button type="button" className={`kr-tab${!wish ? ' active' : ''}`} aria-pressed={!wish} onClick={() => show(null)}>
          {t('armory.sets.now')}
        </button>
        {wishes.map((s) => (
          <button key={s.id} type="button" className={`kr-tab${wish?.id === s.id ? ' active' : ''}`} aria-pressed={wish?.id === s.id}
            onClick={() => show(s.id)} onDoubleClick={() => editable && wish?.id === s.id && renameSet()}>
            {s.name}
          </button>
        ))}
        {editable && wishes.length < MAX_GUEST_WISHES && (
          <button type="button" className="kr-tab armory__addset" onClick={addSet} title={t('armory.sets.addHint')}>+ {t('armory.sets.add')}</button>
        )}
        {editable && wish && (
          <span className="armory__setactions">
            <button type="button" className="btn btn--small btn--ghost" onClick={renameSet}>{t('armory.sets.rename')}</button>
            <button type="button" className="btn btn--small btn--danger" onClick={deleteSet}>{t('common.delete')}</button>
          </span>
        )}
      </nav>
      {error && <div className="alert" role="alert">{error}</div>}

      <div className="armory">
        <DollGrid
          className={wish ? 'doll--set' : ''}
          slot={(s) => (
            <DollSlot key={s} slot={s} item={shown.get(s)} selected={selected === s} hover={hover}
              onSelect={() => setSelected(selected === s ? null : s)} />
          )}
          portrait={(
            <figure className="doll__portrait">
              <div className="doll__noportrait"><ClassIcon code={char.class} size={96} /></div>
            </figure>
          )}
        />
        <div className="armory__side">
          <BonusPanel worn={[...shown.values()]} compare={wish ? [...now.values()] : undefined} />
          {selected && active ? (
            <GuestSlotPanel key={`${active.id}:${selected}`} char={char} set={active} slot={selected}
              item={shown.get(selected) ?? null} editable={editable} onChange={gear.reload} />
          ) : (
            <div className="panel armory__hint">{t(editable ? 'gaster.pickSlot' : 'gaster.readOnly')}</div>
          )}
        </div>
      </div>
      {hover.tip}
    </div>
  )
}

function GuestSlotPanel({ char, set, slot, item, editable, onChange }: {
  char: GuestCharacter
  set: GuestSet
  slot: string
  item: Item | null
  editable: boolean
  onChange: () => Promise<void>
}) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const run = useCallback(async (fn: () => Promise<string | null>) => {
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
    setReading(false)
  }, [onChange])

  const fromWiki = (wikiId: string) => run(async () => {
    const { item: w, wiki } = await fetchWikiItem(wikiId)
    return putGuestItem(set.id, slot, rowFromWiki(w, wiki))
  })

  const fromFile = useCallback((file: Blob) => {
    if (!file.type.startsWith('image/')) {
      setError(t('forradet.new.notImage'))
      return
    }
    setReading(true)
    run(async () => putGuestItem(set.id, slot, await rowFromScreenshot(file)))
  }, [run, set.id, slot, t])

  // Ctrl+V med en bild läser in den i den valda sloten
  useEffect(() => {
    if (!editable) return
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))?.getAsFile()
      if (!file) return
      e.preventDefault()
      fromFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [editable, fromFile])

  const wrongSlot = item && item.slots.length > 0 && !fitsSlot(item, slot)

  return (
    <div className="panel">
      <h2 className="panel-title">{slotLabel(slot)}</h2>
      {error && <div className="alert" role="alert">{error}</div>}
      {item ? (
        <>
          <div className="armory__tooltip"><ItemTooltip item={item} compact iconUrl={itemIconUrl(item)} /></div>
          {item.classes.length > 0 && char.class && !canUse(item, char) && <p className="warn">{t('armory.sets.cantUse', { name: char.name })}</p>}
          {wrongSlot && <p className="warn">{t('gaster.wrongSlot', { slots: item.slots.join(', ') })}</p>}
          <div className="actions">
            {item.wiki_url && <a className="btn btn--small" href={item.wiki_url} target="_blank" rel="noreferrer">{t('wiki.open')}</a>}
            {editable && <button className="btn btn--small btn--ghost" disabled={busy} onClick={() => run(() => removeGuestItem(set.id, slot))}>{t('armory.sets.remove')}</button>}
          </div>
        </>
      ) : (
        <p className="armory__empty">{t('armory.emptySlot')}</p>
      )}

      {editable && (
        <>
          <h3 className="armory__sub">{t('armory.sets.fromWiki')}</h3>
          <WikiSearch key={slot} slot={slot} busy={busy} onPick={(h) => fromWiki(h.id)} />
          <h3 className="armory__sub">{t('gaster.fromScreenshot')}</h3>
          <p className="note">{t('gaster.screenshotHelp')}</p>
          <div className="actions">
            <button type="button" className="btn btn--small" disabled={busy} aria-busy={reading} onClick={() => input.current?.click()}>
              {reading ? t('gaster.reading') : t('gaster.pickImage')}
            </button>
            <input ref={input} type="file" accept="image/*" hidden
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) fromFile(f) }} />
          </div>
        </>
      )}
    </div>
  )
}
