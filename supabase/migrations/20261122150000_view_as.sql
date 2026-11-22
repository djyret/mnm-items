-- Visa som: en admin kan se sidan som en annan roll (besökare, gäst, läsare, redaktör) utan ett
-- extra Discord-konto. Rollen byts i databasen, inte bara i webben: my_role() ger den valda rollen,
-- och all behörighet (is_member, can_edit, is_admin, is_guest, can_view_area, can_read_chapter,
-- ai_usage_start, edge-funktionernas requireAdmin) går via my_role(). Läget besökare ger null,
-- som ett konto utan aktivt medlemskap.
--
-- Bara en riktig admin kan välja läge, och set_view_as() kontrollerar den riktiga rollen, så man
-- kommer alltid tillbaka. Användare har ingen update-rätt på memberships, så kolumnen kan bara
-- ändras via RPC:n. Ett kvarglömt läge hos någon som inte längre är admin gör ingenting, eftersom
-- my_role() bara läser det när den riktiga rollen är admin.

alter table public.memberships
  add column view_as text check (view_as in ('visitor', 'guest', 'reader', 'editor'));

comment on column public.memberships.view_as is
  'Admin som ser sidan som en annan roll (Visa som); null = den egna rollen';

create or replace function public.my_role() returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select case
    when m.role = 'admin' and m.view_as = 'visitor' then null
    when m.role = 'admin' and m.view_as is not null then m.view_as::public.app_role
    else m.role
  end
  from public.memberships m
  where m.user_id = auth.uid() and m.status = 'active'
$$;

create or replace function public.set_view_as(r text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.memberships
    where user_id = auth.uid() and status = 'active' and role = 'admin'
  ) then
    raise exception 'Bara admin kan visa sidan som en annan roll' using errcode = '42501';
  end if;
  if r is not null and r not in ('visitor', 'guest', 'reader', 'editor') then
    raise exception 'Ogiltig roll: %', r using errcode = '22023';
  end if;
  update public.memberships set view_as = r where user_id = auth.uid();
end;
$$;

revoke all on function public.set_view_as(text) from public, anon;
grant execute on function public.set_view_as(text) to authenticated;
