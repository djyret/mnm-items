-- Character Armory: utrustning per slot, utrustningshistorik, önskelista, porträtt och
-- länk från item till krönikekapitlet där det hittades.
--
-- En sanning för utrustning: items.equipped_slot. Den som bär itemet är låntagaren när itemet
-- är utlånat, annars ägaren. Triggern håller status i takt med slotten:
--   * slot satt och status ledig      -> status equippad
--   * status equippad men ingen slot  -> status ledig
--   * reserverad/såld                 -> slot rensas
--   * byter itemet bärare (flyttas, lånas ut, lämnas tillbaka) utan att slotten anges -> slot rensas
-- Varje gång ett item tas på eller av loggas det i item_events ('utrustad' / 'avtagen') med
-- slot i note och karaktärens nivå i level. Behörighet som förut: bara redaktörer skriver (RLS).

-- ---------- Kolumner ----------

alter table public.items
  add column equipped_slot text
    check (equipped_slot in (
      'HEAD', 'FACE', 'EAR_1', 'EAR_2', 'NECK', 'SHOULDERS', 'BACK', 'CHEST', 'SHIRT',
      'WRIST_1', 'WRIST_2', 'HANDS', 'FINGER_1', 'FINGER_2', 'WAIST', 'LEGS', 'FEET',
      'PRIMARY', 'SECONDARY', 'RANGE', 'AMMO'
    )),
  add column found_chapter_id uuid references public.chronicle_chapters(id) on delete set null;

alter table public.characters add column portrait_path text;  -- sökväg i bucket item-images

alter table public.item_events add column level int;  -- bärarens nivå vid utrustning

-- Det enda item som var 'equippad' före Armory får sin enda slot; resten blir lediga.
update public.items i
   set equipped_slot = case when s.slot in ('EAR', 'WRIST', 'FINGER') then s.slot || '_1' else s.slot end
  from (select id, slots[1] as slot from public.items where status = 'equippad' and array_length(slots, 1) = 1) s
 where i.id = s.id
   and (case when s.slot in ('EAR', 'WRIST', 'FINGER') then s.slot || '_1' else s.slot end) in (
     'HEAD', 'FACE', 'EAR_1', 'NECK', 'SHOULDERS', 'BACK', 'CHEST', 'SHIRT', 'WRIST_1', 'HANDS',
     'FINGER_1', 'WAIST', 'LEGS', 'FEET', 'PRIMARY', 'SECONDARY', 'RANGE', 'AMMO');
update public.items set status = 'ledig' where status = 'equippad' and equipped_slot is null;

alter table public.items
  add constraint items_slot_needs_wear check (equipped_slot is null or status in ('equippad', 'utlanad')),
  add constraint items_equippad_has_slot check (status <> 'equippad' or equipped_slot is not null);

-- En karaktär kan bara bära ett item per slot.
create unique index items_one_per_slot on public.items (
  (case when status = 'utlanad' then lent_to_id else holder_id end), equipped_slot
) where equipped_slot is not null;

create index items_found_chapter_idx on public.items(found_chapter_id) where found_chapter_id is not null;

-- ---------- Trigger: status och slot i takt ----------

create or replace function public.items_equipment_sync() returns trigger
language plpgsql as $$
declare
  old_wearer uuid;
  new_wearer uuid;
begin
  if tg_op = 'UPDATE' and old.equipped_slot is not null and new.equipped_slot is not distinct from old.equipped_slot then
    old_wearer := case when old.status = 'utlanad' then old.lent_to_id else old.holder_id end;
    new_wearer := case when new.status = 'utlanad' then new.lent_to_id else new.holder_id end;
    if new_wearer is distinct from old_wearer then
      new.equipped_slot := null;
    end if;
  end if;

  if new.status in ('reserverad', 'sald') then
    new.equipped_slot := null;
  end if;
  if new.equipped_slot is not null and new.status = 'ledig' then
    new.status := 'equippad';
  end if;
  if new.status = 'equippad' and new.equipped_slot is null then
    new.status := 'ledig';
  end if;
  if new.equipped_slot is not null
     and (case when new.status = 'utlanad' then new.lent_to_id else new.holder_id end) is null then
    new.equipped_slot := null;
    if new.status = 'equippad' then new.status := 'ledig'; end if;
  end if;
  return new;
end $$;

create trigger items_equipment_sync
  before insert or update on public.items
  for each row execute function public.items_equipment_sync();

-- Logga på/av. Körs som anroparen: RLS på item_events gäller (redaktörer får skriva).
create or replace function public.items_equipment_log() returns trigger
language plpgsql as $$
declare
  old_wearer uuid;
  new_wearer uuid;
begin
  new_wearer := case when new.equipped_slot is null then null
                     when new.status = 'utlanad' then new.lent_to_id else new.holder_id end;
  if tg_op = 'UPDATE' then
    old_wearer := case when old.equipped_slot is null then null
                       when old.status = 'utlanad' then old.lent_to_id else old.holder_id end;
    if old_wearer is not distinct from new_wearer and old.equipped_slot is not distinct from new.equipped_slot then
      return null;
    end if;
    -- När bäraren raderas finns raden inte längre: då loggas ingen avtagning
    if old.equipped_slot is not null and old_wearer is not null
       and exists (select 1 from public.characters where id = old_wearer) then
      insert into public.item_events (item_id, kind, from_id, note, level)
      values (new.id, 'avtagen', old_wearer, old.equipped_slot,
              (select level from public.characters where id = old_wearer));
    end if;
  end if;
  if new.equipped_slot is not null and new_wearer is not null then
    insert into public.item_events (item_id, kind, to_id, note, level)
    values (new.id, 'utrustad', new_wearer, new.equipped_slot,
            (select level from public.characters where id = new_wearer));
  end if;
  return null;
end $$;

create trigger items_equipment_log
  after insert or update of equipped_slot, status, holder_id, lent_to_id on public.items
  for each row execute function public.items_equipment_log();

-- ---------- Utrusta (byter ut det som sitter i slotten) ----------

create or replace function public.equip_item(p_item uuid, p_slot text) returns void
language plpgsql
set search_path = public
as $$
declare
  it public.items;
  wearer uuid;
  base text := regexp_replace(p_slot, '_[12]$', '');
begin
  select * into it from public.items where id = p_item for update;
  if not found then
    raise exception 'Itemet finns inte' using errcode = 'P0002';
  end if;
  if it.status in ('sald', 'reserverad') then
    raise exception 'Ett sålt eller reserverat item kan inte utrustas' using errcode = '22023';
  end if;
  if cardinality(it.slots) > 0
     and not (base = any(it.slots) or (base = 'SHIRT' and 'ARMS' = any(it.slots))) then
    raise exception 'Itemet passar inte i slotten %', p_slot using errcode = '22023';
  end if;
  wearer := case when it.status = 'utlanad' then it.lent_to_id else it.holder_id end;
  if wearer is null then
    raise exception 'Itemet har ingen ägare att utrusta' using errcode = '22023';
  end if;

  -- Ta av det som sitter där nu (triggern sätter status och loggar)
  update public.items set equipped_slot = null
   where id <> p_item
     and equipped_slot = p_slot
     and (case when status = 'utlanad' then lent_to_id else holder_id end) = wearer;

  update public.items set equipped_slot = p_slot where id = p_item;
end $$;

revoke execute on function public.equip_item(uuid, text) from public, anon;
grant execute on function public.equip_item(uuid, text) to authenticated;

-- ---------- Önskelista ----------

create table public.wishlist (
  id            uuid primary key default gen_random_uuid(),
  character_id  uuid not null references public.characters(id) on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  slot          text,          -- slottkod som i items.slots, t.ex. FINGER
  item_id       uuid references public.items(id) on delete set null,  -- om det finns i förrådet
  note          text,
  created_by    uuid default auth.uid() references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  fulfilled_at  timestamptz
);

create index wishlist_character_idx on public.wishlist(character_id, created_at desc);

alter table public.wishlist enable row level security;

create policy "wishlist: läs om förrådet syns" on public.wishlist
  for select to anon, authenticated using (public.can_view_area('forradet'));
create policy "wishlist: redaktör skapar" on public.wishlist
  for insert to authenticated with check (public.can_edit());
create policy "wishlist: redaktör ändrar" on public.wishlist
  for update to authenticated using (public.can_edit()) with check (public.can_edit());
create policy "wishlist: redaktör raderar" on public.wishlist
  for delete to authenticated using (public.can_edit());

grant select on public.wishlist to anon, authenticated;
grant insert, update, delete on public.wishlist to authenticated;
revoke insert, update, delete, truncate on public.wishlist from anon;

notify pgrst, 'reload schema';
