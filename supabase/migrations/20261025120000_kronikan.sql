-- Krönikan: gängets äventyr som kapitel (en spelkväll) med minnen (bilder, skärmdumpar, anteckningar, klipp),
-- plus en stilbibel (rollista och stilprompt) så att AI-bilderna håller samma utseende.

create table public.chronicle_chapters (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  played_on   date not null default current_date,
  zone        text,            -- skylten i bilden, t.ex. ROTHOLD
  subzone     text,            -- undertexten, t.ex. THRALLED MINE
  summary     text,
  cover_id    uuid,            -- minnet som visas som omslag på tidslinjen
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index chronicle_chapters_played_idx on public.chronicle_chapters(played_on desc);

create trigger chronicle_chapters_touch before update on public.chronicle_chapters
  for each row execute function public.touch_updated_at();

create table public.chronicle_entries (
  id          uuid primary key default gen_random_uuid(),
  chapter_id  uuid not null references public.chronicle_chapters(id) on delete cascade,
  kind        text not null default 'serie'
              check (kind in ('serie', 'skarmdump', 'anteckning', 'klipp')),
  image_path  text,            -- sökväg i bucket kronikan
  caption     text,            -- vad som hände
  quotes      jsonb not null default '[]',   -- [{"who":"Derinx","text":"AAAAH!"}]
  cast_names  text[] not null default '{}',  -- vilka som är med
  subzone     text,            -- om ögonblicket hände på annan plats än kapitlets
  url         text,            -- klipp (YouTube, Medal …)
  position    double precision not null default extract(epoch from now()),
  created_at  timestamptz not null default now()
);

create index chronicle_entries_chapter_idx on public.chronicle_entries(chapter_id, position);

alter table public.chronicle_chapters
  add constraint chronicle_chapters_cover_fk foreign key (cover_id)
  references public.chronicle_entries(id) on delete set null;

-- Rollistan: hjältar, husdjur och återkommande fiender med fast utseende
create table public.chronicle_cast (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  role          text not null default 'hjalte' check (role in ('hjalte', 'husdjur', 'npc')),
  tag_color     text not null default '#8fc8ff',   -- färgen på namnskylten i bilden
  look          text not null default '',           -- utseende, används i bildprompten
  ref_path      text,                               -- referensbild i bucket kronikan
  position      int not null default 0,
  created_at    timestamptz not null default now()
);

-- Fria inställningar, t.ex. stilprompten
create table public.chronicle_settings (
  key    text primary key,
  value  text not null
);

alter table public.chronicle_chapters enable row level security;
alter table public.chronicle_entries  enable row level security;
alter table public.chronicle_cast     enable row level security;
alter table public.chronicle_settings enable row level security;

create policy "open chronicle_chapters" on public.chronicle_chapters for all to anon, authenticated using (true) with check (true);
create policy "open chronicle_entries"  on public.chronicle_entries  for all to anon, authenticated using (true) with check (true);
create policy "open chronicle_cast"     on public.chronicle_cast     for all to anon, authenticated using (true) with check (true);
create policy "open chronicle_settings" on public.chronicle_settings for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on
  public.chronicle_chapters, public.chronicle_entries, public.chronicle_cast, public.chronicle_settings
  to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('kronikan', 'kronikan', true)
on conflict (id) do nothing;

create policy "open kronikan read"   on storage.objects for select to anon, authenticated using (bucket_id = 'kronikan');
create policy "open kronikan insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'kronikan');
create policy "open kronikan update" on storage.objects for update to anon, authenticated using (bucket_id = 'kronikan');
create policy "open kronikan delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'kronikan');

-- Startrollista, beskriven från gängets första seriebilder
insert into public.chronicle_cast (name, role, tag_color, look, position) values
  ('Gabbex', 'hjalte', '#7fdc5a',
   'Halfling druid: young round face, big brown eyes, curly brown hair, light stubble. Cloak and shoulder mantle of green leaves over a green tunic with leather belts and a round bronze tree emblem, brown boots, big backpack with bedroll. Gnarled wooden staff ending in a glowing green spiral with leaves. Green nature magic.',
   1),
  ('Derinx', 'hjalte', '#c07cff',
   'Gnome enchanter: old, small, long white beard, round glasses, tall floppy purple wizard hat with gold trim, purple robe with gold embroidery, leather straps and backpack. Wooden staff topped with a glowing purple arcane spiral. Purple arcane magic.',
   2),
  ('Daremx', 'hjalte', '#4fd2ff',
   'Gnome elementalist: old, small, white beard and bushy eyebrows, brass steampunk goggles on a dark blue cap, navy blue coat with gold trim, leather bandoliers and a large backpack. Casts orange fire and blue water magic from his hands.',
   3),
  ('Alikryssraket', 'husdjur', '#d6c8ff',
   'Daremx''s water elemental pet: a large hunched humanoid made of translucent glowing blue water, splashing droplets, one dark round eye in the middle of its body, no other face.',
   4);

insert into public.chronicle_settings (key, value) values ('stil',
'Stylized 3D animated fantasy illustration in a cinematic Pixar/Blizzard-like render style, landscape 3:2. Low dramatic camera angle with depth of field and blurred rocks, bones or debris in the foreground. Warm torch and lantern light contrasted with vivid glowing magic (purple arcane, green nature, blue water, orange fire), wet reflective ground, sparks and particles. Expressive, humorous cartoon faces and exaggerated reactions; the heroes are small and cute against huge, detailed environments.
Top-left corner: the gold "MONSTERS AND MEMORIES" game logo, and below it a parchment plaque with the zone name in large serif capitals and the sub-area as a smaller subtitle.
Floating MMO-style name tags in colored sans-serif text above characters as specified.
White comic speech bubbles with black hand-lettered text, written exactly as given (Swedish), may include a small skull emoji.');
