/** Spelets valuta: 100 koppar = 1 silver, 100 silver = 1 guld, 100 guld = 1 platinum. */
export const COINS = [
  { key: 'p', name: 'Platinum', value: 1_000_000 },
  { key: 'g', name: 'Guld', value: 10_000 },
  { key: 's', name: 'Silver', value: 100 },
  { key: 'c', name: 'Koppar', value: 1 },
] as const

export type CoinKey = (typeof COINS)[number]['key']
export type Purse = Record<CoinKey, number>

export function toPurse(cp: number | null | undefined): Purse {
  let rest = Math.max(0, Math.floor(cp ?? 0))
  const purse = { p: 0, g: 0, s: 0, c: 0 } as Purse
  for (const coin of COINS) {
    purse[coin.key] = Math.floor(rest / coin.value)
    rest %= coin.value
  }
  return purse
}

export function fromPurse(purse: Partial<Purse>): number {
  return COINS.reduce((sum, coin) => sum + Math.max(0, Math.floor(purse[coin.key] ?? 0)) * coin.value, 0)
}

/** Textform, t.ex. "2p 15g 30s". */
export function formatPrice(cp: number | null | undefined): string {
  if (!cp) return '0c'
  const purse = toPurse(cp)
  return COINS.filter((c) => purse[c.key]).map((c) => `${purse[c.key]}${c.key}`).join(' ')
}
