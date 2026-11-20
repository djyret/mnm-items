-- Adminpanelens synlighet per område: lägsta roll som får se Förrådet, Krönikan och Stilbibeln.
-- Spärras i databasen (läspolicyer), inte bara i menyn. Skrivregler (can_edit) är oförändrade.
--   forradet   = items, item_events, characters  (sidorna Förråd, Karaktärer, Alts, Försäljning)
--   kronikan   = kapitel, minnen, rollistan      (tak över varje kapitels egen synlighet)
--   stilbibeln = chronicle_settings (stilprompten) och sidan Stilbibel
-- Bildfilerna ligger i publika buckets med slumpade namn: policyn styr listning och API-läsning,
-- inte den som redan har en direktlänk (se docs/DECISIONS.md).

create table public.area_access (
  area       text primary key check (area in ('forradet', 'kronikan', 'stilbibeln')),
  min_role   text not null default 'visitor' check (min_role in ('visitor', 'reader', 'editor', 'admin')),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.area_access (area) values ('forradet'), ('kronikan'), ('stilbibeln');

create or replace function public.area_access_stamp() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end $$;

create trigger area_access_stamp before update on public.area_access
  for each row execute function public.area_access_stamp();

alter table public.area_access enable row level security;
revoke all on public.area_access from anon, authenticated;
-- Alla får läsa inställningen (menyn behöver den); bara admin ändrar, och bara rollen
grant select on public.area_access to anon, authenticated;
grant update (min_role) on public.area_access to authenticated;

create policy "area_access: alla läser" on public.area_access
  for select to anon, authenticated using (true);
create policy "area_access: admin ändrar" on public.area_access
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Saknas området i tabellen är det bara admin som ser det
create or replace function public.can_view_area(a text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case coalesce((select x.min_role from public.area_access x where x.area = a), 'admin')
    when 'visitor' then true
    when 'reader'  then public.is_member()
    when 'editor'  then public.can_edit()
    else public.is_admin()
  end
$$;

grant execute on function public.can_view_area(text) to anon, authenticated;

-- ---------- Förrådet ----------

drop policy "characters: alla läser"  on public.characters;
drop policy "items: alla läser"       on public.items;
drop policy "item_events: alla läser" on public.item_events;

create policy "characters: läs om förrådet syns"  on public.characters  for select to anon, authenticated using (public.can_view_area('forradet'));
create policy "items: läs om förrådet syns"       on public.items       for select to anon, authenticated using (public.can_view_area('forradet'));
create policy "item_events: läs om förrådet syns" on public.item_events for select to anon, authenticated using (public.can_view_area('forradet'));

drop policy "item-images: alla läser" on storage.objects;
create policy "item-images: läs om förrådet syns" on storage.objects for select to anon, authenticated
  using (bucket_id = 'item-images' and public.can_view_area('forradet'));

-- ---------- Krönikan ----------

create or replace function public.can_read_chapter(chapter uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_view_area('kronikan') and exists (
    select 1 from public.chronicle_chapters c
    where c.id = chapter
      and (c.visibility = 'public'
           or (c.visibility = 'group' and public.is_member())
           or (c.visibility = 'draft' and public.can_edit()))
  )
$$;

drop policy "chronicle_chapters: läs enligt synlighet" on public.chronicle_chapters;
create policy "chronicle_chapters: läs enligt område och synlighet" on public.chronicle_chapters
  for select to anon, authenticated using (
    public.can_view_area('kronikan') and (
      visibility = 'public'
      or (visibility = 'group' and public.is_member())
      or (visibility = 'draft' and public.can_edit())
    )
  );
-- chronicle_entries går redan via can_read_chapter()

drop policy "chronicle_cast: alla läser" on public.chronicle_cast;
create policy "chronicle_cast: läs om krönikan syns" on public.chronicle_cast
  for select to anon, authenticated using (public.can_view_area('kronikan'));

create or replace function public.can_read_kronika_object(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_edit()
    or (public.can_view_area('kronikan') and exists (select 1 from public.chronicle_cast c where c.ref_path = object_name))
    or exists (
      select 1 from public.chronicle_entries e
      where e.image_path = object_name and public.can_read_chapter(e.chapter_id)
    )
$$;

-- ---------- Stilbibeln ----------

drop policy "chronicle_settings: alla läser" on public.chronicle_settings;
create policy "chronicle_settings: läs om stilbibeln syns" on public.chronicle_settings
  for select to anon, authenticated using (public.can_view_area('stilbibeln'));
