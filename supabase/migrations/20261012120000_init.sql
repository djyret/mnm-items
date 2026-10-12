-- MnM Items: karaktärer, items och händelselogg.
-- Ingen inloggning: anon-rollen får läsa och skriva allt.

create table public.characters (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  player      text,
  class       text,          -- klasskod som i spelet, t.ex. ELE, SHM
  race        text,
  level       int,
  is_main     boolean not null default false,
  notes       text,
  created_at  timestamptz not null default now()
);

create table public.items (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  flags         text[] not null default '{}',   -- MAGIC, UNIQUE, NODROP, LORE ...
  slots         text[] not null default '{}',   -- CHEST, FEET, NECK ...
  ac            int,
  stats         jsonb not null default '{}',    -- {"INT":2,"HP":15,"SV_FIRE":1}
  effect        text,
  description   text,
  weight        numeric,
  size          text,
  classes       text[] not null default '{}',   -- ['ALL'] eller klasskoder
  races         text[] not null default '{}',
  extra_lines   text[] not null default '{}',   -- rader parsern inte kände igen
  image_path    text,                            -- sökväg i bucket item-images
  holder_id     uuid references public.characters(id) on delete set null,
  status        text not null default 'ledig'
                check (status in ('ledig','equippad','utlanad','sald','reserverad')),
  lent_to_id    uuid references public.characters(id) on delete set null,
  sold_to       text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index items_holder_idx on public.items(holder_id);
create index items_name_idx on public.items using gin (to_tsvector('simple', name));

create table public.item_events (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.items(id) on delete cascade,
  kind        text not null,   -- skapad, flyttad, utlanad, aterlamnad, sald, status, redigerad
  from_id     uuid references public.characters(id) on delete set null,
  to_id       uuid references public.characters(id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

create index item_events_item_idx on public.item_events(item_id, created_at desc);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();

-- Öppen åtkomst (ingen inloggning, enligt önskemål)
alter table public.characters  enable row level security;
alter table public.items       enable row level security;
alter table public.item_events enable row level security;

create policy "open characters"  on public.characters  for all to anon, authenticated using (true) with check (true);
create policy "open items"       on public.items       for all to anon, authenticated using (true) with check (true);
create policy "open item_events" on public.item_events for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.characters, public.items, public.item_events to anon, authenticated;

-- Bildlagring
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

create policy "open item-images read"   on storage.objects for select to anon, authenticated using (bucket_id = 'item-images');
create policy "open item-images insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'item-images');
create policy "open item-images update" on storage.objects for update to anon, authenticated using (bucket_id = 'item-images');
create policy "open item-images delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'item-images');

-- Startkaraktärer
insert into public.characters (name, player, class, race, level, is_main) values
  ('Gabbex', 'Daniel', null, null, null, true),
  ('Daremx', null, 'ELE', 'Gnome', 20, false),
  ('Derinx', null, null, null, null, false);
