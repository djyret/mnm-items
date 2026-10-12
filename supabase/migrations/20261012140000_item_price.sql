-- Pris i koppar (100 c = 1 s, 100 s = 1 g, 100 g = 1 p). Begärt pris, eller sålt pris när status = 'sald'.
alter table public.items add column if not exists price_cp bigint check (price_cp >= 0);
