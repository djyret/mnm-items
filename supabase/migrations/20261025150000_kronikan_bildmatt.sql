-- Bildens mått sparas vid uppladdning så läsvyn kan placera stående och kvadratiska bilder rätt direkt
alter table public.chronicle_entries add column if not exists width int;
alter table public.chronicle_entries add column if not exists height int;
