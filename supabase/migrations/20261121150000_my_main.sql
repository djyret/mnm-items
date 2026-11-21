-- Startsidan: varje konto väljer sin main (karaktären som visas på startsidan).
-- memberships får ingen ny skrivpolicy; man ändrar bara sin egen rad via set_my_main().

alter table public.memberships
  add column main_character_id uuid references public.characters(id) on delete set null;

-- Aktiva medlemmar sätter (eller rensar, med null) sin egen main. Rollen ändras inte här.
create or replace function public.set_my_main(char_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_member() then
    raise exception 'Bara godkända medlemmar kan välja main' using errcode = '42501';
  end if;
  if char_id is not null and not exists (select 1 from public.characters where id = char_id) then
    raise exception 'Okänd karaktär' using errcode = '23503';
  end if;
  update public.memberships set main_character_id = char_id where user_id = auth.uid();
end;
$$;

revoke execute on function public.set_my_main(uuid) from public, anon;
grant execute on function public.set_my_main(uuid) to authenticated;
