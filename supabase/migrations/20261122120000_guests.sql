-- Gäster: vänner utanför gänget som vill använda Armory och göra önskeset, utan att deras gear
-- hamnar i förrådet. Egen roll (guest) och egna tabeller; characters, items och gear_sets rörs inte.
--   * Gästen loggar in med Discord och godkänns av admin som Gäst.
--   * Gästen läser krönikan (även kapitel synliga för gruppen) och gästernas armory, inte förrådet.
--   * Gästen ändrar bara sina egna gästkaraktärer. Admin kan rätta allt.
--   * Gästens "Nu"-utrustning och önskeset fylls från wikin eller en avläst skärmdump (parse-item,
--     egen lägre kvot). Allt sparas på raderna i guest_set_items; inga filer i Storage.
--
-- Den nya enum-värdet används bara som text ('guest') i den här filen, så att filen kan köras i en
-- och samma transaktion (ett nytt enum-värde får inte användas som enum förrän det är committat).

alter type public.app_role add value if not exists 'guest';

-- ---------- Rollerna ----------
-- Medlem = läsare, redaktör eller admin. Gäst räknas INTE som medlem: förrådet och allt som
-- kräver is_member() förblir stängt för gäster.

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role()::text in ('reader', 'editor', 'admin'), false)
$$;

create or replace function public.is_guest() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role()::text = 'guest', false)
$$;

-- Får använda gästernas armory och wikin: medlemmar och gäster
create or replace function public.can_use_armory() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_member() or public.is_guest()
$$;

grant execute on function public.is_guest(), public.can_use_armory() to anon, authenticated;

-- ---------- Områden: gäster ser krönikan som en läsare, inget annat ----------

create or replace function public.can_view_area(a text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case coalesce((select x.min_role from public.area_access x where x.area = a), 'admin')
    when 'visitor' then true
    when 'reader'  then public.is_member() or (a = 'kronikan' and public.is_guest())
    when 'editor'  then public.can_edit()
    else public.is_admin()
  end
$$;

create or replace function public.can_read_chapter(chapter uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_view_area('kronikan') and exists (
    select 1 from public.chronicle_chapters c
    where c.id = chapter
      and (c.visibility = 'public'
           or (c.visibility = 'group' and (public.is_member() or public.is_guest()))
           or (c.visibility = 'draft' and public.can_edit()))
  )
$$;

drop policy "chronicle_chapters: läs enligt område och synlighet" on public.chronicle_chapters;
create policy "chronicle_chapters: läs enligt område och synlighet" on public.chronicle_chapters
  for select to anon, authenticated using (
    public.can_view_area('kronikan') and (
      visibility = 'public'
      or (visibility = 'group' and (public.is_member() or public.is_guest()))
      or (visibility = 'draft' and public.can_edit())
    )
  );

-- ---------- AI-kvot: gäster får läsa skärmdumpar, med lägre gräns ----------

create or replace function public.ai_usage_start(fn text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  used int;
  lim int;
  new_id bigint;
begin
  if not (public.can_edit() or (fn = 'parse-item' and public.is_guest())) then
    raise exception 'Du behöver vara redaktör för att använda AI-funktionerna' using errcode = '42501';
  end if;
  lim := case when public.is_guest() then 30 else public.ai_daily_limit(fn) end;
  -- Samtidiga anrop från samma användare köas, så kvoten inte kan passeras med parallella klick
  perform pg_advisory_xact_lock(hashtext('ai_usage:' || auth.uid()::text));
  -- Alla anrop räknas, även misslyckade: ok sätts av anroparen själv och går därför inte att lita på
  select count(*) into used from public.ai_usage u
  where u.user_id = auth.uid() and u.fn = ai_usage_start.fn
    and u.created_at > now() - interval '24 hours';
  if used >= lim then
    raise exception 'Dagens kvot för % är slut (% per dygn)', fn, lim using errcode = 'P0001', hint = 'quota';
  end if;
  insert into public.ai_usage (user_id, fn) values (auth.uid(), fn) returning id into new_id;
  return new_id;
end $$;

-- ---------- Gästkaraktärer ----------

create table public.guest_characters (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 40),
  class       text check (class is null or length(class) <= 40),
  race        text check (race is null or length(race) <= 40),
  level       int check (level is null or level between 1 and 100),
  created_at  timestamptz not null default now()
);
create index guest_characters_owner_idx on public.guest_characters(owner_id);

-- "Nu" (kind = now, en per karaktär) och upp till 4 önskeset (kind = wish)
create table public.guest_sets (
  id          uuid primary key default gen_random_uuid(),
  guest_id    uuid not null references public.guest_characters(id) on delete cascade,
  kind        text not null default 'wish' check (kind in ('now', 'wish')),
  name        text not null check (length(trim(name)) between 1 and 40),
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index guest_sets_guest_idx on public.guest_sets(guest_id, position);
create unique index guest_sets_one_now on public.guest_sets(guest_id) where kind = 'now';

-- Samma form som gear_set_items, men utan koppling till förrådet. detail = resten av tooltipen
-- (flags, effect, description, weight, size, races, extra_lines, enchant_name).
-- icon = wikins ikonadress eller en liten urklippt ikon (data-URL) från skärmdumpen.
create table public.guest_set_items (
  set_id         uuid not null references public.guest_sets(id) on delete cascade,
  slot           text not null check (slot in (
    'HEAD', 'FACE', 'EAR_1', 'EAR_2', 'NECK', 'SHOULDERS', 'BACK', 'CHEST', 'SHIRT',
    'WRIST_1', 'WRIST_2', 'HANDS', 'FINGER_1', 'FINGER_2', 'WAIST', 'LEGS', 'FEET',
    'PRIMARY', 'SECONDARY', 'RANGE', 'AMMO'
  )),
  wiki_id        text check (wiki_id is null or length(wiki_id) <= 200),
  wiki_url       text check (wiki_url is null or wiki_url like 'https://monstersandmemories.wiki/%'),
  name           text not null check (length(trim(name)) between 1 and 120),
  -- Bara wikins egna ikoner eller en inbäddad bild: inga godtyckliga externa adresser (spårning)
  icon           text check (icon is null or (length(icon) <= 40000
                   and (icon like 'https://monstersandmemories.wiki/%' or icon ~ '^data:image/(webp|png|jpeg);base64,'))),
  slots          text[] not null default '{}',
  classes        text[] not null default '{}',
  ac             int,
  stats          jsonb not null default '{}',
  enchant_stats  jsonb not null default '{}',
  detail         jsonb not null default '{}' check (pg_column_size(detail) <= 20000),
  primary key (set_id, slot)
);

-- Gränser: 6 karaktärer per konto (admin undantagen), 4 önskeset per karaktär
create or replace function public.guest_characters_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin()
     and (select count(*) from public.guest_characters where owner_id = new.owner_id) >= 6 then
    raise exception 'Högst 6 gästkaraktärer per konto' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger guest_characters_limit before insert on public.guest_characters
  for each row execute function public.guest_characters_limit();

create or replace function public.guest_sets_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'wish'
     and (select count(*) from public.guest_sets where guest_id = new.guest_id and kind = 'wish') >= 4 then
    raise exception 'Högst 4 önskeset per karaktär' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger guest_sets_limit before insert on public.guest_sets
  for each row execute function public.guest_sets_limit();

-- Ägaren (eller admin) av en gästkaraktär, ett set
create or replace function public.owns_guest(g uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.guest_characters c where c.id = g and c.owner_id = auth.uid()
  )
$$;

create or replace function public.owns_guest_set(s uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.guest_sets x where x.id = s and public.owns_guest(x.guest_id))
$$;

grant execute on function public.owns_guest(uuid), public.owns_guest_set(uuid) to authenticated;

-- ---------- RLS ----------

alter table public.guest_characters enable row level security;
alter table public.guest_sets       enable row level security;
alter table public.guest_set_items  enable row level security;

revoke all on public.guest_characters, public.guest_sets, public.guest_set_items from anon, authenticated;
grant select, insert, update, delete on public.guest_characters, public.guest_sets, public.guest_set_items to authenticated;

-- Läsning: medlemmar och gäster
create policy "guest_characters: läs" on public.guest_characters
  for select to authenticated using (public.can_use_armory());
create policy "guest_sets: läs" on public.guest_sets
  for select to authenticated using (public.can_use_armory());
create policy "guest_set_items: läs" on public.guest_set_items
  for select to authenticated using (public.can_use_armory());

-- Gästkaraktärer: gäster och redaktörer skapar åt sig själva; ägaren eller admin ändrar och raderar
create policy "guest_characters: skapa egen" on public.guest_characters
  for insert to authenticated
  with check (owner_id = auth.uid() and (public.is_guest() or public.can_edit()));
create policy "guest_characters: ägaren ändrar" on public.guest_characters
  for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy "guest_characters: ägaren raderar" on public.guest_characters
  for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

-- Set och set-items följer karaktärens ägare
create policy "guest_sets: ägaren skapar" on public.guest_sets
  for insert to authenticated with check (public.owns_guest(guest_id));
create policy "guest_sets: ägaren ändrar" on public.guest_sets
  for update to authenticated using (public.owns_guest(guest_id)) with check (public.owns_guest(guest_id));
create policy "guest_sets: ägaren raderar" on public.guest_sets
  for delete to authenticated using (public.owns_guest(guest_id));

create policy "guest_set_items: ägaren skapar" on public.guest_set_items
  for insert to authenticated with check (public.owns_guest_set(set_id));
create policy "guest_set_items: ägaren ändrar" on public.guest_set_items
  for update to authenticated using (public.owns_guest_set(set_id)) with check (public.owns_guest_set(set_id));
create policy "guest_set_items: ägaren raderar" on public.guest_set_items
  for delete to authenticated using (public.owns_guest_set(set_id));

notify pgrst, 'reload schema';
