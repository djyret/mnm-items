-- Önskeset i Armory: upp till 4 tänkta utrustningar per karaktär, för att jämföra stats.
-- Ett set-item är antingen ett item ur förrådet (item_id) eller ett uppslag från wikin (wiki_id).
-- Namn, ikon, slots och stats sparas på raden, så att settet går att visa utan nya wikiuppslag
-- (vi sparar bara de items gänget själv valt, ingen spegling av wikin).

create table public.gear_sets (
  id            uuid primary key default gen_random_uuid(),
  character_id  uuid not null references public.characters(id) on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  position      int not null default 0,
  created_by    uuid default auth.uid() references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index gear_sets_character_idx on public.gear_sets(character_id, position);

create table public.gear_set_items (
  set_id         uuid not null references public.gear_sets(id) on delete cascade,
  slot           text not null check (slot in (
    'HEAD', 'FACE', 'EAR_1', 'EAR_2', 'NECK', 'SHOULDERS', 'BACK', 'CHEST', 'SHIRT',
    'WRIST_1', 'WRIST_2', 'HANDS', 'FINGER_1', 'FINGER_2', 'WAIST', 'LEGS', 'FEET',
    'PRIMARY', 'SECONDARY', 'RANGE', 'AMMO'
  )),
  item_id        uuid references public.items(id) on delete set null,
  wiki_id        text,
  wiki_url       text check (wiki_url is null or wiki_url like 'https://monstersandmemories.wiki/%'),
  name           text not null,
  icon           text,
  slots          text[] not null default '{}',
  classes        text[] not null default '{}',
  ac             int,
  stats          jsonb not null default '{}',
  enchant_stats  jsonb not null default '{}',
  primary key (set_id, slot)
);

-- Högst 4 set per karaktär
create or replace function public.gear_sets_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.gear_sets where character_id = new.character_id) >= 4 then
    raise exception 'Högst 4 önskeset per karaktär' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger gear_sets_limit
  before insert on public.gear_sets
  for each row execute function public.gear_sets_limit();

alter table public.gear_sets enable row level security;
alter table public.gear_set_items enable row level security;

create policy "gear_sets: läs om förrådet syns" on public.gear_sets
  for select to anon, authenticated using (public.can_view_area('forradet'));
create policy "gear_sets: redaktör skapar" on public.gear_sets
  for insert to authenticated with check (public.can_edit());
create policy "gear_sets: redaktör ändrar" on public.gear_sets
  for update to authenticated using (public.can_edit()) with check (public.can_edit());
create policy "gear_sets: redaktör raderar" on public.gear_sets
  for delete to authenticated using (public.can_edit());

create policy "gear_set_items: läs om förrådet syns" on public.gear_set_items
  for select to anon, authenticated using (public.can_view_area('forradet'));
create policy "gear_set_items: redaktör skapar" on public.gear_set_items
  for insert to authenticated with check (public.can_edit());
create policy "gear_set_items: redaktör ändrar" on public.gear_set_items
  for update to authenticated using (public.can_edit()) with check (public.can_edit());
create policy "gear_set_items: redaktör raderar" on public.gear_set_items
  for delete to authenticated using (public.can_edit());

grant select on public.gear_sets, public.gear_set_items to anon, authenticated;
grant insert, update, delete on public.gear_sets, public.gear_set_items to authenticated;
revoke insert, update, delete, truncate on public.gear_sets, public.gear_set_items from anon;

notify pgrst, 'reload schema';
