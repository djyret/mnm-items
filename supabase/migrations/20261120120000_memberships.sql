-- Fas 0, steg 1: medlemskap och roller (docs/SECURITY_MODEL.md).
-- Rent additivt: inga befintliga tabeller eller policyer ändras. Låsningen av skrivning kommer i steg 2.

create type public.app_role as enum ('reader', 'editor', 'admin');

-- En rad per inloggat konto. Visitor = ingen aktiv rad.
create table public.memberships (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  role         public.app_role not null default 'reader',
  status       text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  display_name text,            -- från Discord, bara för visning
  discord_id   text,
  approved_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger memberships_touch before update on public.memberships
  for each row execute function public.touch_updated_at();

-- Vem ändrade vems roll/status och när
create table public.membership_audit (
  id         bigint generated always as identity primary key,
  actor_id   uuid not null,
  target_id  uuid not null,
  old_role   public.app_role,
  new_role   public.app_role,
  old_status text,
  new_status text,
  created_at timestamptz not null default now()
);

create index membership_audit_target_idx on public.membership_audit(target_id, created_at desc);

-- ---------- Hjälpfunktioner för policyer ----------
-- security definer så att de kan läsa memberships oavsett den som frågars RLS.

create or replace function public.my_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select m.role from public.memberships m
  where m.user_id = auth.uid() and m.status = 'active'
$$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.my_role() is not null
$$;

create or replace function public.can_edit() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() in ('editor', 'admin'), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

grant execute on function public.my_role(), public.is_member(), public.can_edit(), public.is_admin() to anon, authenticated;

-- ---------- Nya konton ----------
-- Discord-inloggning skapar ett väntande medlemskap. Det ger inga rättigheter förrän en admin godkänner.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.memberships (user_id, display_name, discord_id)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data -> 'custom_claims' ->> 'global_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.email
    ),
    new.raw_user_meta_data ->> 'provider_id'
  )
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS ----------

alter table public.memberships      enable row level security;
alter table public.membership_audit enable row level security;

-- Klienten får bara läsa. All ändring går via admin_set_membership().
revoke all on public.memberships, public.membership_audit from anon, authenticated;
grant select on public.memberships, public.membership_audit to authenticated;

create policy "memberships: egen rad eller admin" on public.memberships
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "membership_audit: admin" on public.membership_audit
  for select to authenticated using (public.is_admin());

-- ---------- Adminåtgärd: sätt roll och status ----------

create or replace function public.admin_set_membership(target uuid, new_role public.app_role, new_status text)
returns public.memberships
language plpgsql security definer set search_path = '' as $$
declare
  old    public.memberships;
  result public.memberships;
begin
  if not public.is_admin() then
    raise exception 'Bara admin kan ändra medlemskap' using errcode = '42501';
  end if;
  if new_status not in ('pending', 'active', 'suspended') then
    raise exception 'Ogiltig status: %', new_status using errcode = '22023';
  end if;

  -- Lås alla aktiva admins så att två admins inte kan degradera varandra samtidigt
  perform 1 from public.memberships where role = 'admin' and status = 'active' for update;

  select * into old from public.memberships where user_id = target for update;
  if not found then
    raise exception 'Okänd användare' using errcode = 'P0002';
  end if;

  if old.role = 'admin' and old.status = 'active'
     and (new_role <> 'admin' or new_status <> 'active')
     and not exists (
       select 1 from public.memberships
       where role = 'admin' and status = 'active' and user_id <> target
     ) then
    raise exception 'Det måste finnas minst en aktiv admin' using errcode = '42501';
  end if;

  update public.memberships
  set role = new_role,
      status = new_status,
      approved_by = case when new_status = 'active' and old.status <> 'active' then auth.uid() else approved_by end
  where user_id = target
  returning * into result;

  insert into public.membership_audit (actor_id, target_id, old_role, new_role, old_status, new_status)
  values (auth.uid(), target, old.role, new_role, old.status, new_status);

  return result;
end $$;

revoke execute on function public.admin_set_membership(uuid, public.app_role, text) from public, anon;
grant execute on function public.admin_set_membership(uuid, public.app_role, text) to authenticated;
