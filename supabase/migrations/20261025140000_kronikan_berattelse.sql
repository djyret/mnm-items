-- Krönikören: kvällens berättelse på kapitlet, och vilka skärmdumpar ett ögonblick bygger på
alter table public.chronicle_chapters add column if not exists story text;
alter table public.chronicle_entries add column if not exists source_ids uuid[] not null default '{}';
