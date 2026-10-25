-- Husdjur får nytt namn vid varje summon, så namnet sparas per minne: {"Vattenelementalen":"Nauturdis"}
alter table public.chronicle_entries add column if not exists pet_names jsonb not null default '{}';

update public.chronicle_cast
set name = 'Vattenelementalen',
    look = 'Daremx''s summoned water elemental pet: a large hunched humanoid made of translucent glowing blue water, splashing droplets, one dark round eye in the middle of its body, no other face.'
where name = 'Alikryssraket';
