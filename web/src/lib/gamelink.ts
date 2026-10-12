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
  /** Max tecken per rad som spelet räknar dem (chattrutan rymmer 255). */
  maxLen: number
  /** Max itemlänkar per rad – säkerhetsmarginal, gear med stats gav 3–4 i test. */
  maxLinks: number
}

const linkCount = (line: string) => (line.match(/<link=/g) ?? []).length

/**
 * Uppskattad längd som spelets chattruta räknar.
 * Vanlig text = 1 per tecken. En itemlänk ≈ 22 + 2 × längden av "[Namn]".
 * Anpassat till test i spelet 2026-10-12: 255 vanliga tecken ryms;
 * 3 men inte 4 × [Bloodied Vileguards] (64 st/länk); 7 men inte 8 × [Wood] (34 st/länk).
 */
export const LINK_BASE = 22
export function gameLength(line: string): number {
  let len = 0
  const rest = line.replace(/<link=[^>]*>[\s\S]*?<\/link>/g, (link) => {
    const name = link.replace(/<[^>]+>/g, '')
    len += LINK_BASE + 2 * name.length
    return ''
  })
  return len + rest.replace(/<[^>]+>/g, '').length
}

/**
 * Bygger en eller flera chattrader: "WTS [A] 75s, [B] 1g 50s - PST".
 * Ny rad när den uppskattade längden i spelet skulle passera maxLen, eller länkarna bli fler än maxLinks.
 */
export function buildWts(items: Pick<Item, 'name' | 'game_link' | 'price_cp'>[], opt: WtsOptions): string[] {
  const parts = items.map((i) => [chatItem(i), chatPrice(i.price_cp)].filter(Boolean).join(' '))
  const head = opt.prefix.trim()
  const tail = opt.suffix.trim() ? ` ${opt.suffix.trim()}` : ''
  const lines: string[] = []
  let cur: string[] = []
  const render = (ps: string[]) => `${head} ${ps.join(', ')}${tail}`.trim()
  for (const p of parts) {
    const next = render([...cur, p])
    if (cur.length && (gameLength(next) > opt.maxLen || linkCount(next) > opt.maxLinks)) {
      lines.push(render(cur))
      cur = []
    }
    cur.push(p)
  }
  if (cur.length) lines.push(render(cur))
  return lines
}
