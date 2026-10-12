export type Status = 'ledig' | 'equippad' | 'utlanad' | 'sald' | 'reserverad'

export interface Character {
  id: string
  name: string
  player: string | null
  class: string | null
  race: string | null
  level: number | null
  is_main: boolean
  notes: string | null
  created_at: string
}

export interface Item {
  id: string
  name: string
  flags: string[]
  slots: string[]
  ac: number | null
  stats: Record<string, number>
  effect: string | null
  description: string | null
  weight: number | null
  size: string | null
  classes: string[]
  races: string[]
  extra_lines: string[]
  image_path: string | null
  icon_path: string | null
  holder_id: string | null
  status: Status
  lent_to_id: string | null
  sold_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ItemDraft = Omit<Item, 'id' | 'created_at' | 'updated_at'>

export interface ItemEvent {
  id: string
  item_id: string
  kind: string
  from_id: string | null
  to_id: string | null
  note: string | null
  created_at: string
}

/** Det parse-item-funktionen returnerar. */
export interface ParsedItem {
  name: string
  flags: string[]
  slots: string[]
  ac: number | null
  stats: { key: string; value: number }[]
  effect: string | null
  description: string | null
  weight: number | null
  size: string | null
  classes: string[]
  races: string[]
  extra_lines: string[]
  icon_box?: { x: number; y: number; width: number; height: number } | null
}
