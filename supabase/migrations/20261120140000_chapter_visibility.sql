-- Fas 0, steg 3: synlighet per krönikekapitel (docs/SECURITY_MODEL.md, docs/DECISIONS.md).
--   public = alla, group = inloggade medlemmar, draft = redaktörer/admin.
-- Minnena ärver kapitlets synlighet. Items, karaktärer, rollista och stilbibel förblir publika.
-- Bilderna ligger kvar i en publik bucket med slumpade namn; besökare kan inte längre lista bucketen,
-- så en bild nås bara via ett minne man får läsa (eller en länk någon delat).

-- Befintliga kapitel blir publika (beslut 2026-11-20), nya kapitel blir gruppinterna
alter table public.chronicle_chapters
  add column visibility text not null default 'public' check (visibility in ('public', 'group', 'draft')),
  add column created_by uuid references auth.users(id) on delete set null default auth.uid();
alter table public.chronicle_chapters alter column visibility set default 'group';

create or replace function public.can_read_chapter(chapter uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chronicle_chapters c
    where c.id = chapter
      and (c.visibility = 'public'
           or (c.visibility = 'group' and public.is_member())
           or (c.visibility = 'draft' and public.can_edit()))
  )
$$;

grant execute on function public.can_read_chapter(uuid) to anon, authenticated;

drop policy "chronicle_chapters: alla läser" on public.chronicle_chapters;
create policy "chronicle_chapters: läs enligt synlighet" on public.chronicle_chapters
  for select to anon, authenticated using (
    visibility = 'public'
    or (visibility = 'group' and public.is_member())
    or (visibility = 'draft' and public.can_edit())
  );

drop policy "chronicle_entries: alla läser" on public.chronicle_entries;
create policy "chronicle_entries: läs enligt kapitlet" on public.chronicle_entries
  for select to anon, authenticated using (public.can_read_chapter(chapter_id));

-- ---------- Storage: listning och API-läsning av kronikan ----------
-- Publika URL:er (/object/public/…) påverkas inte av policyn; den styr listning, nedladdning via API
-- och de läsningar som update/delete behöver.

create index if not exists chronicle_entries_image_idx on public.chronicle_entries(image_path);

create or replace function public.can_read_kronika_object(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_edit()
    or exists (select 1 from public.chronicle_cast c where c.ref_path = object_name)
    or exists (
      select 1 from public.chronicle_entries e
      where e.image_path = object_name and public.can_read_chapter(e.chapter_id)
    )
$$;

grant execute on function public.can_read_kronika_object(text) to anon, authenticated;

drop policy "kronikan: alla läser" on storage.objects;
create policy "kronikan: läs om minnet får läsas" on storage.objects for select to anon, authenticated
  using (bucket_id = 'kronikan' and public.can_read_kronika_object(name));
