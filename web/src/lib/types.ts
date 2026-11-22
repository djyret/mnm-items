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
  /** Porträtt i bucket item-images */
  portrait_path: string | null
  /** Bonuspoängen vid skapandet, t.ex. { WIS: 6, STA: 4 } (högst 10) */
  stat_points: Record<string, number>
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
  /** Riktpris – vad itemet brukar gå för */
  price_cp: number | null
  /** Faktiskt försäljningspris */
  sold_price_cp: number | null
  game_link: string | null
  notes: string | null
  /** Slot där itemet sitter på (EAR_1, FINGER_2 …). Bäraren är låntagaren om itemet är utlånat, annars ägaren. */
  equipped_slot: string | null
  /** Krönikekapitlet där itemet hittades */
  found_chapter_id: string | null
  /** Spelets gröna enchant-rad före siffran, t.ex. 'Enchant Necklace: Greater Wisdom' */
  enchant_name: string | null
  /** Enchantens stats, läggs ovanpå itemets egna: {"WIS": 4} */
  enchant_stats: Record<string, number>
  /** Monsters and Memories Wiki: stabilt id, sidans adress och ikon */
  wiki_id: string | null
  wiki_url: string | null
  wiki_icon: string | null
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
  /** Bärarens nivå när itemet togs på eller av */
  level: number | null
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
  enchant?: { name: string; stats: { key: string; value: number }[] } | null
  icon_box?: { x: number; y: number; width: number; height: number } | null
}

// ---------- Krönikan ----------

export type EntryKind = 'serie' | 'skarmdump' | 'anteckning' | 'klipp'

export interface Quote {
  who: string
  text: string
}

export interface Chapter {
  id: string
  title: string
  played_on: string
  zone: string | null
  subzone: string | null
  summary: string | null
  /** Kvällens berättelse, stycken separerade med tom rad */
  story: string | null
  /** Kvällen som längre saga: stycken separerade med tom rad, avsnitt börjar med '## Rubrik' */
  saga: string | null
  cover_id: string | null
  /** Vem som får läsa kapitlet och dess minnen (RLS) */
  visibility: Visibility
  created_by: string | null
  created_at: string
  updated_at: string
}

/** public = alla, group = inloggade medlemmar, draft = redaktörer */
export type Visibility = 'public' | 'group' | 'draft'

export interface Entry {
  id: string
  chapter_id: string
  kind: EntryKind
  image_path: string | null
  caption: string | null
  quotes: Quote[]
  cast_names: string[]
  /** Husdjur heter olika vid varje summon: {"Vattenelementalen":"Nauturdis"} */
  pet_names: Record<string, string>
  /** Skärmdumpar ett ögonblick bygger på */
  source_ids: string[]
  /** Bildens mått, sparade vid uppladdning */
  width: number | null
  height: number | null
  subzone: string | null
  url: string | null
  position: number
  created_at: string
}

export interface CastMember {
  id: string
  name: string
  role: 'hjalte' | 'husdjur' | 'npc'
  tag_color: string
  look: string
  ref_path: string | null
  position: number
  created_at: string
}

/** guest = vän utanför gänget: gästernas armory och krönikan, inte förrådet */
export type AppRole = 'guest' | 'reader' | 'editor' | 'admin'
export type MembershipStatus = 'pending' | 'active' | 'suspended'

export interface Membership {
  user_id: string
  role: AppRole
  status: MembershipStatus
  display_name: string | null
  discord_id: string | null
  approved_by: string | null
  /** Karaktären som visas på startsidan (sätts med set_my_main) */
  main_character_id: string | null
  /** Admin som ser sidan som en annan roll (Visa som, set_view_as); null = egen roll */
  view_as: ViewAs | null
  created_at: string
  updated_at: string
}

export type ViewAs = 'visitor' | 'guest' | 'reader' | 'editor'
