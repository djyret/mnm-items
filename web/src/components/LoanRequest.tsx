import { useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { CLASSES, EVENT_NOTES } from '../lib/constants'
import { useI18n, type Key } from '../lib/i18n'
import { logEvent } from '../lib/items'
import { useStore } from '../lib/store'
import { imageUrl, supabase } from '../lib/supabase'
import type { Character, Item } from '../lib/types'

type T = (key: Key, vars?: Record<string, string | number>) => string

const pretty = (slot: string | undefined) => (slot ? slot.charAt(0) + slot.slice(1).toLowerCase() : '')

/**
 * Ett stycke per ägare: vem som ska plocka ut vad ur banken.
 * Med bilder läggs en direktlänk till screenshoten efter varje item – Discord visar då bilden under meddelandet.
 */
type ImageMode = 'kort' | 'lang' | 'ingen'

function holderBlock(holderName: string, list: Item[], mode: ImageMode, t: T): string {
  return [
    t('forradet.loan.holderAsk', { name: holderName }),
    ...list.map((i) => {
      const line = `- ${i.name}${i.slots.length ? ` (${i.slots.map(pretty).join('/')})` : ''}`
      const url = mode !== 'ingen' ? imageUrl(i.image_path) : null
      if (!url) return line
      // Kort: dold länk [bild](url) – texten blir kortare i Discord
      return mode === 'kort' ? `${line} [${t('forradet.loan.imageLink')}](${url})` : `${line} ${url}`
    }),
  ].join('\n')
}

/** Webbläsarens urklipp tar bara PNG – konvertera screenshoten. */
async function copyImage(url: string) {
  const blob = await (await fetch(url)).blob()
  const bmp = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bmp.width
  canvas.height = bmp.height
  canvas.getContext('2d')!.drawImage(bmp, 0, 0)
  bmp.close()
  const png = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'))
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
}

const MODES: ImageMode[] = ['kort', 'lang', 'ingen']

/** Lånebegäran till Discord för valda items, grupperat per ägare. */
export function LoanRequest({ alt, items, onClear }: { alt: Character; items: Item[]; onClear: () => void }) {
  const { charById, reload } = useStore()
  const { canEdit } = useAuth()
  const { t } = useI18n()
  const [copied, setCopied] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [mode, setMode] = useState<ImageMode>('kort')

  const byHolder = useMemo(() => {
    const m = new Map<string, Item[]>()
    for (const i of items) {
      const k = i.holder_id ?? ''
      m.set(k, [...(m.get(k) ?? []), i])
    }
    return [...m.entries()].map(([id, list]) => [charById(id)?.name ?? t('forradet.loan.unknownHolder'), list] as const)
  }, [items, charById, t])

  const head = `**${t('forradet.loan.head', { name: alt.name })}**${
    alt.class || alt.level
      ? ` (${[alt.class && (CLASSES[alt.class] || alt.class), alt.level && `lvl ${alt.level}`].filter(Boolean).join(', ')})`
      : ''
  }`
  const full = [head, ...byHolder.map(([name, list]) => holderBlock(name, list, mode, t))].join('\n\n')
  const withPics = items.filter((i) => i.image_path)

  async function copyPic(item: Item) {
    try {
      await copyImage(imageUrl(item.image_path)!)
      setCopied(`bild:${item.id}`)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setCopied('fel')
    }
  }

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setCopied('fel')
    }
  }

  async function reserve() {
    setBusy(true)
    const ids = items.map((i) => i.id)
    const { error } = await supabase.from('items').update({ status: 'reserverad', lent_to_id: alt.id }).in('id', ids)
    if (!error) {
      await Promise.all(items.map((i) => logEvent(i.id, 'status', { from_id: i.holder_id, to_id: alt.id, note: EVENT_NOTES.reserverad })))
      await reload()
      setDone(t('forradet.loan.reserved', { n: items.length, name: alt.name }))
    } else {
      setDone(t('forradet.loan.reserveFailed', { error: error.message }))
    }
    setBusy(false)
  }

  return (
    <div className="panel loan">
      <div className="loan__head">
        <h2 className="panel-title">{t('forradet.loan.title')}</h2>
        <button type="button" className="btn btn--ghost btn--small" onClick={onClear}>{t('forradet.loan.clear')}</button>
      </div>
      <p className="note">{t('forradet.loan.intro')}</p>

      <div className="field loan__mode">
        <span>{t('forradet.loan.images')}</span>
        <div className="chips">
          {MODES.map((k) => (
            <button key={k} type="button" className={`chip${mode === k ? ' is-active' : ''}`} onClick={() => setMode(k)}>
              {t(`forradet.loan.mode.${k}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="loan__out">
        <div className="loan__outhead">
          <span>{t('forradet.loan.full')}</span>
          <button type="button" className="btn btn--primary btn--small" onClick={() => copy('alla', full)}>
            {copied === 'alla' ? t('forradet.loan.copied') : t('forradet.loan.copyAll')}
          </button>
        </div>
        <textarea readOnly rows={Math.min(14, full.split('\n').length + 1)} value={full} onFocus={(e) => e.target.select()} />
      </div>

      {byHolder.length > 1 && (
        <div className="loan__per">
          {byHolder.map(([name, list]) => (
            <button key={name} type="button" className="btn btn--small" onClick={() => copy(name, `${head}\n\n${holderBlock(name, list, mode, t)}`)}>
              {copied === name ? t('forradet.loan.copied') : t('forradet.loan.copyFor', { name, n: list.length })}
            </button>
          ))}
        </div>
      )}
      {withPics.length > 0 && (
        <div className="loan__pics">
          <span className="note">{t('forradet.loan.picsIntro')}</span>
          <div className="loan__per">
            {withPics.map((i) => (
              <button key={i.id} type="button" className="btn btn--small" onClick={() => copyPic(i)}>
                {copied === `bild:${i.id}` ? t('forradet.loan.picCopied') : t('forradet.loan.copyPic', { name: i.name })}
              </button>
            ))}
          </div>
        </div>
      )}
      {copied === 'fel' && <p className="alert">{t('forradet.loan.copyFailed')}</p>}

      {canEdit && <div className="loan__reserve">
        <button type="button" className="btn" disabled={busy || !!done} onClick={reserve}>
          {t('forradet.loan.reserve', { name: alt.name })}
        </button>
        <small className="note">{t('forradet.loan.reserveHint')} <b>{t('forradet.itemPage.lend')}</b>.</small>
      </div>}
      {done && <p className="note">{done}</p>}
    </div>
  )
}
