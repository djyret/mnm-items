-- Sagan: kvällen berättad som en längre fantasysaga, bredvid den korta krönikan på pergamentet
alter table public.chronicle_chapters add column if not exists saga text;
