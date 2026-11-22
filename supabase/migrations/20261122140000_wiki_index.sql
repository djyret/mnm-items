-- Setbyggaren i Armory och grundstats per karaktär.
--
-- 1. wiki_items: ett index över wikins items (namn, slots, klasser, raser, stats, var de finns) som
--    setbyggaren väljer ur. Gromple, wikins admin, gav 2026-11-22 OK till en kopia för gängets
--    begränsade bruk. Indexet fylls av admin via Edge Function wiki-index, med adminens egen token
--    (aldrig service_role). Källan visas med länk där datan syns, och varje item länkar till wikin.
--    Items utan slot (material, quest-items) sparas bara med namn, så att nästa uppdatering vet
--    att de redan är hämtade.
-- 2. stat_points: de 10 bonuspoäng spelaren placerar när karaktären skapas, på både gängets och
--    gästernas karaktärer. Grundvärdena per ras och klass ligger i webben (lib/basestats.ts).

create table public.wiki_items (
  id               text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$' and length(id) <= 200),
  name             text not null check (length(name) <= 200),
  url              text not null check (url like 'https://monstersandmemories.wiki/%'),
  icon             text check (icon is null or icon like 'https://monstersandmemories.wiki/%'),
  slots            text[] not null default '{}',
  classes          text[] not null default '{}',
  races            text[] not null default '{}',
  flags            text[] not null default '{}',
  two_hand         boolean not null default false,
  ac               int,
  stats            jsonb not null default '{}' check (jsonb_typeof(stats) = 'object'),
  -- Zoner där itemet droppar, och hur det fås: drop, vendor, quest
  zones            text[] not null default '{}',
  sources          text[] not null default '{}',
  wiki_updated_at  timestamptz,
  synced_at        timestamptz not null default now()
);
create index wiki_items_gear_idx on public.wiki_items using gin (slots) where slots <> '{}';

alter table public.wiki_items enable row level security;

create policy "wiki_items: läs för gäster och gänget" on public.wiki_items
  for select to authenticated using (public.can_use_armory());
create policy "wiki_items: admin fyller" on public.wiki_items
  for insert to authenticated with check (public.is_admin());
create policy "wiki_items: admin uppdaterar" on public.wiki_items
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "wiki_items: admin raderar" on public.wiki_items
  for delete to authenticated using (public.is_admin());

grant select, insert, update, delete on public.wiki_items to authenticated;
revoke all on public.wiki_items from anon;

-- ---------- Bonuspoäng ----------

-- {"WIS": 6, "STA": 4}: bara de sju attributen, heltal 0–10, högst 10 totalt.
-- Taket per ras och klass kontrolleras i webben (siffrorna kommer från wikin och kan ändras).
create or replace function public.valid_stat_points(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(p) = 'object'
    and not exists (
      select 1 from jsonb_each(p) e
      where e.key not in ('STR', 'STA', 'DEX', 'AGI', 'INT', 'WIS', 'CHA')
         or jsonb_typeof(e.value) <> 'number'
         or (e.value)::numeric <> trunc((e.value)::numeric)
         or (e.value)::numeric < 0
    )
    and coalesce((select sum((e.value)::numeric) from jsonb_each(p) e), 0) <= 10
$$;

alter table public.characters
  add column stat_points jsonb not null default '{}'
  constraint characters_stat_points_check check (public.valid_stat_points(stat_points));
alter table public.guest_characters
  add column stat_points jsonb not null default '{}'
  constraint guest_characters_stat_points_check check (public.valid_stat_points(stat_points));

notify pgrst, 'reload schema';
