import { formatPrice } from './money'
import type { Item } from './types'

/*
 * Spelet godtar inte itemlänkar som klistras in i chatten – <link=…> skrivs om till text
 * (testat 2026-10-12). WTS-texten blir därför vanlig text: [Namn] pris.
 */

/** Pris som i spelets chatt: 6s, 20s, 1g 50s, 2p. */
export function chatPrice(cp: number | null | undefined): string {
  return cp ? formatPrice(cp) : ''
}

export interface WtsOptions {
  prefix: string
  suffix: string
  /** Max tecken per rad (chattrutan rymmer 255). */
  maxLen: number
}

/**
 * Bygger en eller flera chattrader: "WTS [A] 75s, [B] 1g 50s - PST".
 * Ny rad när raden skulle bli längre än maxLen.
 */
export function buildWts(items: Pick<Item, 'name' | 'price_cp'>[], opt: WtsOptions): string[] {
  const parts = items.map((i) => [`[${i.name}]`, chatPrice(i.price_cp)].filter(Boolean).join(' '))
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
