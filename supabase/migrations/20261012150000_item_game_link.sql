-- Itemlänk ur spelets chatt, t.ex. <link="item|<id>|<nr>"><color=green><b><u>[Namn]</u></b></color></link>
alter table public.items add column if not exists game_link text;
