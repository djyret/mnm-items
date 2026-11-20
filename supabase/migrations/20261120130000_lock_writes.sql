-- Fas 0, steg 2: bara aktiva redaktörer och admins får skriva (docs/SECURITY_MODEL.md).
-- Läsning är fortfarande öppen för alla. Kräver steg 1 (memberships, can_edit()).
-- Måste gå ut samtidigt som de nya Edge Functions: seriebild laddar upp med anroparens token.

-- ---------- Tabeller ----------

drop policy "open characters"         on public.characters;
drop policy "open items"              on public.items;
drop policy "open item_events"        on public.item_events;
drop policy "open chronicle_chapters" on public.chronicle_chapters;
drop policy "open chronicle_entries"  on public.chronicle_entries;
drop policy "open chronicle_cast"     on public.chronicle_cast;
drop policy "open chronicle_settings" on public.chronicle_settings;

do $$
declare
  t text;
begin
  foreach t in array array[
    'characters', 'items', 'item_events',
    'chronicle_chapters', 'chronicle_entries', 'chronicle_cast', 'chronicle_settings'
  ] loop
    execute format('create policy "%1$s: alla läser" on public.%1$I for select to anon, authenticated using (true)', t);
    execute format('create policy "%1$s: redaktör skapar" on public.%1$I for insert to authenticated with check (public.can_edit())', t);
    execute format('create policy "%1$s: redaktör ändrar" on public.%1$I for update to authenticated using (public.can_edit()) with check (public.can_edit())', t);
    execute format('create policy "%1$s: redaktör raderar" on public.%1$I for delete to authenticated using (public.can_edit())', t);
    -- anon behöver bara läsa; policyerna ovan avgör för inloggade
    execute format('revoke insert, update, delete, truncate on public.%I from anon', t);
  end loop;
end $$;

-- ---------- Storage ----------
-- Båda buckets förblir publika att läsa (privat kronikan kommer i steg 3).

drop policy "open item-images read"   on storage.objects;
drop policy "open item-images insert" on storage.objects;
drop policy "open item-images update" on storage.objects;
drop policy "open item-images delete" on storage.objects;
drop policy "open kronikan read"      on storage.objects;
drop policy "open kronikan insert"    on storage.objects;
drop policy "open kronikan update"    on storage.objects;
drop policy "open kronikan delete"    on storage.objects;

create policy "item-images: alla läser" on storage.objects for select to anon, authenticated
  using (bucket_id = 'item-images');
create policy "item-images: redaktör laddar upp" on storage.objects for insert to authenticated
  with check (bucket_id = 'item-images' and public.can_edit());
create policy "item-images: redaktör ändrar" on storage.objects for update to authenticated
  using (bucket_id = 'item-images' and public.can_edit()) with check (bucket_id = 'item-images' and public.can_edit());
create policy "item-images: redaktör raderar" on storage.objects for delete to authenticated
  using (bucket_id = 'item-images' and public.can_edit());

create policy "kronikan: alla läser" on storage.objects for select to anon, authenticated
  using (bucket_id = 'kronikan');
create policy "kronikan: redaktör laddar upp" on storage.objects for insert to authenticated
  with check (bucket_id = 'kronikan' and public.can_edit());
create policy "kronikan: redaktör ändrar" on storage.objects for update to authenticated
  using (bucket_id = 'kronikan' and public.can_edit()) with check (bucket_id = 'kronikan' and public.can_edit());
create policy "kronikan: redaktör raderar" on storage.objects for delete to authenticated
  using (bucket_id = 'kronikan' and public.can_edit());

-- ---------- AI-kvot ----------
-- En rad per AI-anrop. Raden skrivs innan modellen anropas, så kvoten gäller även anrop som kraschar.

create table public.ai_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  fn         text not null check (fn in ('parse-item', 'berattelse', 'seriebild')),
  ok         boolean,          -- null = pågår/okänt; bara logg, påverkar inte kvoten
  created_at timestamptz not null default now()
);

create index ai_usage_user_idx on public.ai_usage(user_id, fn, created_at desc);

alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;

create policy "ai_usage: egna rader eller admin" on public.ai_usage
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Gränser per användare och dygn (rullande 24 h)
create or replace function public.ai_daily_limit(fn text) returns int
language sql immutable as $$
  select case fn when 'parse-item' then 100 when 'berattelse' then 20 when 'seriebild' then 20 else 0 end
$$;

-- Kräver redaktör, kontrollerar kvoten och bokar ett anrop. Returnerar radens id.
create or replace function public.ai_usage_start(fn text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  used int;
  new_id bigint;
begin
  if not public.can_edit() then
    raise exception 'Du behöver vara redaktör för att använda AI-funktionerna' using errcode = '42501';
  end if;
  -- Samtidiga anrop från samma användare köas, så kvoten inte kan passeras med parallella klick
  perform pg_advisory_xact_lock(hashtext('ai_usage:' || auth.uid()::text));
  -- Alla anrop räknas, även misslyckade: ok sätts av anroparen själv och går därför inte att lita på
  select count(*) into used from public.ai_usage u
  where u.user_id = auth.uid() and u.fn = ai_usage_start.fn
    and u.created_at > now() - interval '24 hours';
  if used >= public.ai_daily_limit(fn) then
    raise exception 'Dagens kvot för % är slut (% per dygn)', fn, public.ai_daily_limit(fn) using errcode = 'P0001', hint = 'quota';
  end if;
  insert into public.ai_usage (user_id, fn) values (auth.uid(), fn) returning id into new_id;
  return new_id;
end $$;

create or replace function public.ai_usage_finish(usage_id bigint, success boolean) returns void
language sql security definer set search_path = '' as $$
  update public.ai_usage set ok = success
  where id = usage_id and user_id = auth.uid() and ok is null
$$;

revoke execute on function public.ai_usage_start(text), public.ai_usage_finish(bigint, boolean) from public, anon;
grant execute on function public.ai_usage_start(text), public.ai_usage_finish(bigint, boolean) to authenticated;
