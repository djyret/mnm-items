import { formatPrice } from './money'
import type { Item } from './types'

/**
 * Spelets itemlänk i chatten:
 *   <link="item|cd11c53996a914e9973c8c71|3624578"><color=green><b><u>[Bloodied Vileguards]</u></b></color></link>
 * Urklipp ur spelet kan ha radbrytningar mitt i, de tas bort.
 */
const LINK_RE = /<link="item\|[^"]+">[\s\S]*?<\/link>/

export function extractGameLink(text: string): string | null {
  const m = text.match(LINK_RE)
  return m ? m[0].replace(/\s+/g, ' ').replace(/\[\s+/, '[').replace(/\s+\]/, ']') : null
}

export function nameFromGameLink(link: string): string | null {
  const m = link.match(/\[([^\]]+)\]/)
  return m ? m[1].trim() : null
}

/** Item som det skrivs i chatten: länken om den finns, annars [Namn]. */
export function chatItem(item: Pick<Item, 'name' | 'game_link'>): string {
  return item.game_link ?? `[${item.name}]`
}

/** Pris som i spelets chatt: 6s, 20s, 1g 50s, 2p. */
export function chatPrice(cp: number | null | undefined): string {
  return cp ? formatPrice(cp) : ''
}

export interface WtsOptions {
  prefix: string
  suffix: string
  maxLen: number
}

/**
 * Bygger en eller flera chattrader: "WTS [A] 75s, [B] 1g 50s - PST".
 * Delar upp på flera rader om en rad skulle bli längre än maxLen.
 */
export function buildWts(items: Pick<Item, 'name' | 'game_link' | 'price_cp'>[], opt: WtsOptions): string[] {
  const parts = items.map((i) => [chatItem(i), chatPrice(i.price_cp)].filter(Boolean).join(' '))
  const head = opt.prefix.trim()
  const tail = opt.suffix.trim() ? ` ${opt.suffix.trim()}` : ''
  const lines: string[] = []
  let cur: string[] = []
  const render = (ps: string[]) => `${head} ${ps.join(', ')}${tail}`.trim()
  for (const p of parts) {
    if (cur.length && render([...cur, p]).length > opt.maxLen) {
      lines.push(render(cur))
      cur = []
    }
    cur.push(p)
  }
  if (cur.length) lines.push(render(cur))
  return lines
}
