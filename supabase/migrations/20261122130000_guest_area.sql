-- Gästernas armory blir ett eget område i adminpanelen (area_access 'gaster'), och Gäst blir ett eget
-- steg i rollstegen för alla områden: visitor < guest < reader < editor < admin.
--   * 'guest' = inloggade gäster och gänget. Ersätter undantaget i can_view_area() där gäster
--     släpptes in i krönikan när den krävde 'reader'. Krönikan står på 'visitor', så inget ändras i dag;
--     vill admin stänga krönikan för utloggade men ha kvar gästerna väljs nu 'guest'.
--   * Området 'gaster' startar på 'guest' (som hittills). 'visitor' öppnar läsningen för utloggade;
--     'reader' och uppåt stänger ute gästerna helt, även från deras egna karaktärer.
--   * Skrivning i guest_* och gästernas skärmdumpsläsning kräver också att området syns.

alter table public.area_access drop constraint area_access_area_check;
alter table public.area_access add constraint area_access_area_check
  check (area in ('forradet', 'kronikan', 'stilbibeln', 'gaster'));
alter table public.area_access drop constraint area_access_min_role_check;
alter table public.area_access add constraint area_access_min_role_check
  check (min_role in ('visitor', 'guest', 'reader', 'editor', 'admin'));

insert into public.area_access (area, min_role) values ('gaster', 'guest') on conflict (area) do nothing;

create or replace function public.can_view_area(a text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case coalesce((select x.min_role from public.area_access x where x.area = a), 'admin')
    when 'visitor' then true
    when 'guest'   then public.is_member() or public.is_guest()
    when 'reader'  then public.is_member()
    when 'editor'  then public.can_edit()
    else public.is_admin()
  end
$$;

-- ---------- Gästtabellerna: läsning och skrivning följer området ----------

grant select on public.guest_characters, public.guest_sets, public.guest_set_items to anon;

drop policy "guest_characters: läs" on public.guest_characters;
drop policy "guest_sets: läs" on public.guest_sets;
drop policy "guest_set_items: läs" on public.guest_set_items;
create policy "guest_characters: läs om gästerna syns" on public.guest_characters
  for select to anon, authenticated using (public.can_view_area('gaster'));
create policy "guest_sets: läs om gästerna syns" on public.guest_sets
  for select to anon, authenticated using (public.can_view_area('gaster'));
create policy "guest_set_items: läs om gästerna syns" on public.guest_set_items
  for select to anon, authenticated using (public.can_view_area('gaster'));

drop policy "guest_characters: skapa egen" on public.guest_characters;
drop policy "guest_characters: ägaren ändrar" on public.guest_characters;
drop policy "guest_characters: ägaren raderar" on public.guest_characters;
create policy "guest_characters: skapa egen" on public.guest_characters
  for insert to authenticated
  with check (public.can_view_area('gaster') and owner_id = auth.uid() and (public.is_guest() or public.can_edit()));
create policy "guest_characters: ägaren ändrar" on public.guest_characters
  for update to authenticated
  using (public.can_view_area('gaster') and (owner_id = auth.uid() or public.is_admin()))
  with check (public.can_view_area('gaster') and (owner_id = auth.uid() or public.is_admin()));
create policy "guest_characters: ägaren raderar" on public.guest_characters
  for delete to authenticated using (public.can_view_area('gaster') and (owner_id = auth.uid() or public.is_admin()));

-- owns_guest() bär områdeskontrollen för set och set-items
create or replace function public.owns_guest(g uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_view_area('gaster') and (public.is_admin() or exists (
    select 1 from public.guest_characters c where c.id = g and c.owner_id = auth.uid()
  ))
$$;

-- ---------- Skärmdumpsläsning för gäster bara när området är öppet för dem ----------

create or replace function public.ai_usage_start(fn text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  used int;
  lim int;
  new_id bigint;
begin
  if not (public.can_edit() or (fn = 'parse-item' and public.is_guest() and public.can_view_area('gaster'))) then
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

notify pgrst, 'reload schema';
