-- Riktpris (price_cp) skiljs från faktiskt försäljningspris (sold_price_cp).
alter table public.items add column if not exists sold_price_cp bigint check (sold_price_cp >= 0);

-- Redan sålda items: det sparade priset var försäljningspriset
update public.items set sold_price_cp = price_cp where status = 'sald' and sold_price_cp is null;
