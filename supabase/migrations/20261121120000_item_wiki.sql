-- Länk från item till Monsters and Memories Wiki (partner-API, se docs/DECISIONS.md).
--   wiki_id   = wikins stabila id (fungerar även om itemet byter namn där)
--   wiki_url  = itemets sida på wikin (villkor: varje item länkar dit)
--   wiki_icon = wikins ikon-URL, används när itemet saknar egen utklippt ikon

alter table public.items
  add column wiki_id text,
  add column wiki_url text check (wiki_url is null or wiki_url like 'https://monstersandmemories.wiki/%'),
  add column wiki_icon text check (wiki_icon is null or wiki_icon like 'https://monstersandmemories.wiki/%');

notify pgrst, 'reload schema';
