-- Enchants: spelets gröna rad "Enchant Necklace: Greater Wisdom +4 WIS" står skild från itemets
-- grundstats och läggs ovanpå dem. Sparas i egna kolumner så att Armory kan räkna med dem.
--   enchant_name  = allt före siffran, t.ex. 'Enchant Necklace: Greater Wisdom'
--   enchant_stats = {"WIS": 4}

alter table public.items
  add column enchant_name text,
  add column enchant_stats jsonb not null default '{}';

-- Flytta enchant-rader som avläsningen lagt i effect eller extra_lines
do $$
declare
  r record;
  m text[];
begin
  for r in
    select i.id, l.line
      from public.items i
      cross join lateral unnest(array_append(i.extra_lines, i.effect)) as l(line)
     where l.line ~ '^Enchant [^:]+:.*[+-][0-9]+ [A-Z_]+$'
  loop
    m := regexp_match(r.line, '^(.*?)\s*([+-][0-9]+) ([A-Z_]+)$');
    update public.items
       set enchant_name  = m[1],
           enchant_stats = enchant_stats || jsonb_build_object(m[3], m[2]::int),
           extra_lines   = array_remove(extra_lines, r.line),
           effect        = case when effect = r.line then null else effect end
     where id = r.id;
  end loop;
end $$;

-- Avläsningen har ibland lagt vikten bland stats
update public.items
   set weight = coalesce(weight, (stats ->> 'WEIGHT')::numeric),
       stats  = stats - 'WEIGHT'
 where stats ? 'WEIGHT';

notify pgrst, 'reload schema';
