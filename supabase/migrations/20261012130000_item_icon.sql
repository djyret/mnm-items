-- Utklippt item-ikon (liten bild i bucket item-images)
alter table public.items add column if not exists icon_path text;
