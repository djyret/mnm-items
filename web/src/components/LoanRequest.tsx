import { useMemo, useState } from 'react'
import { CLASSES } from '../lib/constants'
import { logEvent } from '../lib/items'
import { useStore } from '../lib/store'
import { imageUrl, supabase } from '../lib/supabase'
import type { Character, Item } from '../lib/types'

const pretty = (slot: string | undefined) => (slot ? slot.charAt(0) + slot.slice(1).toLowerCase() : '')

/**
 * Ett stycke per ägare: vem som ska plocka ut vad ur banken.
 * Med bilder läggs en direktlänk till screenshoten efter varje item – Discord visar då bilden under meddelandet.
 */
type ImageMode = 'kort' | 'lang' | 'ingen'

function holderBlock(holderName: string, list: Item[], mode: ImageMode): string {
  return [
    `**${holderName}** – kan du plocka ut ur banken:`,
    ...list.map((i) => {
      const line = `- ${i.name}${i.slots.length ? ` (${i.slots.map(pretty).join('/')})` : ''}`
      const url = mode !== 'ingen' ? imageUrl(i.image_path) : null
      if (!url) return line
      // Kort: dold länk [bild](url) – texten blir kortare i Discord
      return mode === 'kort' ? `${line} [bild](${url})` : `${line} ${url}`
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

/** Lånebegäran till Discord för valda items, grupperat per ägare. */
export function LoanRequest({ alt, items, onClear }: { alt: Character; items: Item[]; onClear: () => void }) {
  const { charById, reload } = useStore()
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
    return [...m.entries()].map(([id, list]) => [charById(id)?.name ?? 'Okänd ägare', list] as const)
  }, [items, charById])

  const head = `**Lån till ${alt.name}**${
    alt.class || alt.level
      ? ` (${[alt.class && (CLASSES[alt.class] || alt.class), alt.level && `lvl ${alt.level}`].filter(Boolean).join(', ')})`
      : ''
  }`
  const full = [head, ...byHolder.map(([name, list]) => holderBlock(name, list, mode))].join('\n\n')
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
      await Promise.all(items.map((i) => logEvent(i.id, 'status', { from_id: i.holder_id, to_id: alt.id, note: 'Reserverad' })))
      await reload()
      setDone(`${items.length} items är reserverade för ${alt.name}.`)
    } else {
      setDone(`Kunde inte reservera: ${error.message}`)
    }
    setBusy(false)
  }

  return (
    <div className="panel loan">
      <div className="loan__head">
        <h2 className="panel-title">Discord-meddelande</h2>
        <button type="button" className="btn btn--ghost btn--small" onClick={onClear}>Avmarkera alla</button>
      </div>
      <p className="note">Kopiera och klistra in i Discord. Varje person ser vad hen ska plocka ut.</p>

      <div className="field loan__mode">
        <span>Bilder i meddelandet</span>
        <div className="chips">
          {([
            ['kort', 'Korta länkar [bild]'],
            ['lang', 'Hela länkar'],
            ['ingen', 'Inga bilder'],
          ] as const).map(([k, label]) => (
            <button key={k} type="button" className={`chip${mode === k ? ' is-active' : ''}`} onClick={() => setMode(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="loan__out">
        <div className="loan__outhead">
          <span>Hela meddelandet</span>
          <button type="button" className="btn btn--primary btn--small" onClick={() => copy('alla', full)}>
            {copied === 'alla' ? 'Kopierat!' : 'Kopiera allt'}
          </button>
        </div>
        <textarea readOnly rows={Math.min(14, full.split('\n').length + 1)} value={full} onFocus={(e) => e.target.select()} />
      </div>

      {byHolder.length > 1 && (
        <div className="loan__per">
          {byHolder.map(([name, list]) => (
            <button key={name} type="button" className="chip" onClick={() => copy(name, `${head}\n\n${holderBlock(name, list, mode)}`)}>
              {copied === name ? 'Kopierat!' : `Kopiera bara till ${name} (${list.length})`}
            </button>
          ))}
        </div>
      )}
      {withPics.length > 0 && (
        <div className="loan__pics">
          <span className="note">Eller kopiera en bild i taget och klistra in den i Discord:</span>
          <div className="loan__per">
            {withPics.map((i) => (
              <button key={i.id} type="button" className="chip" onClick={() => copyPic(i)}>
                {copied === `bild:${i.id}` ? 'Bild kopierad!' : `Kopiera bild: ${i.name}`}
              </button>
            ))}
          </div>
        </div>
      )}
      {copied === 'fel' && <p className="alert">Kunde inte kopiera automatiskt – markera texten och tryck Ctrl+C.</p>}

      <div className="loan__reserve">
        <button type="button" className="btn" disabled={busy || !!done} onClick={reserve}>
          Markera som reserverade för {alt.name}
        </button>
        <small className="note">Då ser alla att itemen är på väg. När du fått dem: öppna itemet och tryck <b>Låna ut</b>.</small>
      </div>
      {done && <p className="note">{done}</p>}
    </div>
  )
}
