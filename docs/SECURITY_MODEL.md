# Säkerhetsmodell

Hur roller, Row Level Security (RLS), Storage och Edge Functions hänger ihop. Beslut bakom: `docs/DECISIONS.md`.
Bakgrund och fullständiga krav: `docs/ROADMAP.md` §7 och §17–18.

> **Status 2026-11-20:** steg 1 och 2 i drift (inloggning, medlemskap, bara redaktörer skriver, AI kräver
> inloggad redaktör med kvot). Steg 3 (synlighet per kapitel) byggt på branch `fas0-steg3-synlighet`.
> Steg 3 avviker från planen nedan på en punkt: `kronikan` förblir **publik** med olistbara, slumpade
> bildnamn i stället för privat bucket med signerade URL:er (se DECISIONS.md). Avsnitten om privat bucket
> och ändringar i `seriebild`/`kronikaUrl` gäller alltså inte än.

## Roller

| Roll | Vem | Läser | Skriver |
|---|---|---|---|
| **Visitor** | Ej inloggad, eller inloggad utan aktivt medlemskap (`pending`, `suspended`) | Publika kapitel, items, karaktärer | Inget |
| **Reader** | Aktivt medlemskap, roll `reader` | + gruppkapitel | Inget |
| **Editor** | Aktivt medlemskap, roll `editor` | + utkast | Allt delat innehåll, uppladdningar, AI-funktioner (med kvot) |
| **Admin** | Aktivt medlemskap, roll `admin` | Allt | Allt + medlemskap och roller |

Visitor är ingen rad i databasen: det är frånvaron av ett aktivt medlemskap.

## Datamodell (steg 1)

```sql
create type public.app_role as enum ('reader', 'editor', 'admin');

create table public.memberships (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  role         public.app_role not null default 'reader',
  status       text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  display_name text,            -- från Discord, bara för visning
  discord_id   text,
  approved_by  uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.membership_audit (   -- vem ändrade vems roll/status och när
  id         bigint generated always as identity primary key,
  actor_id   uuid not null,
  target_id  uuid not null,
  old_role   public.app_role, new_role   public.app_role,
  old_status text,            new_status text,
  created_at timestamptz not null default now()
);
```

- En trigger på `auth.users` (insert) skapar `memberships`-raden med `pending` och fyller i namn och id från Discord-metadata.
- **Klienten får aldrig skriva till `memberships`.** Inga insert/update/delete-grants. Ändringar går bara via
  `admin_set_membership(target uuid, role app_role, status text)`, en `security definer`-funktion som kräver
  `is_admin()`, vägrar att låta admin degradera sig själv om ingen annan admin finns, och skriver till `membership_audit`.
- SELECT på `memberships`: egen rad för alla inloggade, alla rader för admin.

### Hjälpfunktioner

`security definer`, `stable`, `set search_path = ''`. Används i alla policyer:

| Funktion | Sann när |
|---|---|
| `my_role()` | Returnerar roll om aktivt medlemskap, annars `null` |
| `is_member()` | Aktiv, valfri roll |
| `can_edit()` | Aktiv, `editor` eller `admin` |
| `is_admin()` | Aktiv, `admin` |
| `can_read_chapter(chapter uuid)` | Steg 3: kapitlets synlighet tillåter den som frågar |

(`current_role` är reserverat i SQL, därav `my_role`.)

### Bootstrap av första admin

Engångs-SQL i Supabase-dashboarden efter att Daniel loggat in med Discord första gången:

```sql
-- Kontrollera först att det är rätt rad:
select user_id, display_name, status, created_at from public.memberships order by created_at;

update public.memberships set role = 'admin', status = 'active'
where user_id = '<user_id från raden ovan>';
```

Görs direkt i SQL-editorn (kör som `postgres`), så den hamnar inte i `membership_audit`. Alla senare ändringar görs på sidan **Medlemmar**.

## Policyer per tabell

### Steg 2: lås skrivning

Alla befintliga `open …`-policyer tas bort och ersätts så här.

| Tabell | SELECT | INSERT / UPDATE / DELETE |
|---|---|---|
| `characters`, `items`, `item_events` | alla (`anon`, `authenticated`) | `can_edit()` |
| `chronicle_chapters`, `chronicle_entries` | alla (ändras i steg 3) | `can_edit()` |
| `chronicle_cast`, `chronicle_settings` | alla | `can_edit()` |
| `memberships` | egen rad / admin | ingen (bara via RPC) |
| `membership_audit` | admin | ingen (skrivs av RPC) |
| `ai_usage` | egen rad / admin | ingen direkt; skrivs via `ai_usage_start()` / `ai_usage_finish()` |

Grants: `anon` får bara `select` på innehållstabellerna. `authenticated` behåller insert/update/delete och policyerna avgör.

### Steg 3: synlighet

```sql
alter table public.chronicle_chapters
  add column visibility text not null default 'group' check (visibility in ('public', 'group', 'draft')),
  add column created_by uuid references auth.users(id) default auth.uid();
```

| Tabell | SELECT |
|---|---|
| `chronicle_chapters` | `visibility = 'public'` eller (`'group'` och `is_member()`) eller (`'draft'` och `can_edit()`) |
| `chronicle_entries` | `can_read_chapter(chapter_id)` |

Att byta `visibility` är en vanlig update för Editors. Med "Editor ändrar allt delat" behövs ingen separat publiceringsroll.

### Områden (adminpanelen)

`area_access(area, min_role)` styr lägsta roll som får **läsa** varje område; admin ändrar den på `#/admin`
(update-policy `is_admin()`, kolumngrant bara på `min_role`). `can_view_area(area)` ingår i läspolicyerna:

| Område | Tabeller / storage |
|---|---|
| `forradet` | `characters`, `items`, `item_events`, `wishlist`, listning i `item-images` (även porträtt) |
| `kronikan` | `chronicle_chapters` (plus kapitlets `visibility`), `chronicle_entries` (via `can_read_chapter`), `chronicle_cast`, listning i `kronikan` |
| `stilbibeln` | `chronicle_settings` |

Skrivregler (`can_edit()`) påverkas inte. Saknas en rad i `area_access` ser bara admin området.
Webben döljer menyknappar och sidor via `useAreas()` / `RequireArea`, men det är databasen som spärrar.

### Armory (migration `20261120160000_armory`)

- `items.equipped_slot` är enda sanningen för utrustning. Triggern `items_equipment_sync` håller `status` i takt
  (slot ⇒ `equippad`, eller `utlanad` när låntagaren bär den) och rensar slotten när itemet byter bärare, säljs
  eller reserveras. `items_equipment_log` skriver `utrustad`/`avtagen` i `item_events` som anroparen, så RLS gäller.
- Unikt index: en karaktär bär högst ett item per slot.
- `equip_item(item, slot)` är `security invoker` (RLS avgör), körbar bara för `authenticated`; anon nekas.
- `wishlist`: läs `can_view_area('forradet')`, skriv `can_edit()`, samma mönster som övriga tabeller.

## Storage

| Bucket | Steg 2 | Steg 3 |
|---|---|---|
| `item-images` | Publik läsning. Skrivning: `can_edit()` | Oförändrad (items är publika) |
| `kronikan` | Publik läsning. Skrivning: `can_edit()` | **Byggt:** bucketen förblir publik (`/object/public/…` fungerar för den som har adressen), men SELECT/listning via API kräver `can_read_kronika_object(name)`. *Planerat alternativ:* privat bucket. |

`can_read_kronika_object(name)`: objektet är läsbart om det refereras av ett `chronicle_entries.image_path` i ett kapitel
som den som frågar får läsa, eller av `chronicle_cast.ref_path` (rollistan är publik). Objekt som inte refereras alls
kan bara läsas av Editors. Filerna ligger platt (`<uuid>.webp`), så policyn slår upp i tabellerna i stället för att flytta filer.

Konsekvenser av privat `kronikan` (steg 3):
- `kronikaUrl()` i `web/src/lib/kronikan.ts` blir asynkron och hämtar signerade URL:er i batch (`createSignedUrls`, TTL ca 1 h).
  Påverkar läsvyn, sagan, bildspelet och verkstaden.
- `seriebild` hämtar referensbilder från `/object/public/kronikan/…`. Det byts mot autentiserad hämtning.
- Bilder som redan varit publika kan finnas cachade eller nedladdade. Privat bucket skyddar bara framtida åtkomst.

## Edge Functions (`parse-item`, `berattelse`, `seriebild`)

I dag: `verify_jwt = false`, gängordet i `x-gang-word`, och `berattelse`/`seriebild` läser PostgREST och
(seriebild) **laddar upp till Storage med anon-nyckeln**.

Nytt (steg 2):
1. Klienten skickar användarens access token: `Authorization: Bearer <session.access_token>`.
2. `verify_jwt` kan stå kvar som `false`. Funktionen verifierar själv med `supabase.auth.getUser()` på en klient
   skapad med anroparens `Authorization`-header. Det blir samma mönster oavsett nyckeltyp.
3. All databas- och Storage-åtkomst går via den användarklienten, så RLS och Storage-policyer gäller.
   Seriebildens uppladdning går igenom eftersom anroparen är Editor.
4. Funktionen anropar `ai_usage_start(fn)` som anroparen. Den kräver `can_edit()` (annars `403`), låser per användare,
   räknar anroparens anrop senaste 24 h (annars `429`) och bokar en rad, allt *före* modellanropet.
5. Alla bokade anrop räknas mot kvoten, även misslyckade: `ai_usage_finish(id, ok)` kan anropas av användaren själv,
   så `ok` är bara logg. Gränser i `ai_daily_limit()`: `parse-item` 100, `berattelse` 20, `seriebild` 20.
   Gemensam kod: `supabase/functions/_shared/auth.ts`.
6. Gängordet tas bort ur klient (`web/src/lib/functions.ts`), funktioner och CORS-headers. Hemligheten `GANG_WORD` raderas.

**Beroende:** steg 2 (låsa Storage-skrivning) och den här ändringen måste gå ut tillsammans, annars slutar seriebilder fungera.

### `wiki-item` (2026-11-21)

Proxy mot Monsters and Memories Wikis partner-API. Nyckeln ligger bara i secret `MNM_WIKI_KEY` och skickas
aldrig till webbläsaren. `requireEditor()` i `_shared/auth.ts` kräver inloggad redaktör (`can_edit()` via RPC)
men bokar ingen AI-kvot, eftersom uppslag inte kostar AI. Wikins egen gräns är 120 anrop/minut per nyckel.
Funktionen skriver inget i databasen; webben sparar `wiki_id`/`wiki_url`/`wiki_icon` med användarens rättigheter.

## Inloggning (Discord + GitHub Pages)

- Supabase-klienten skapas med `auth: { flowType: 'pkce' }`. Då kommer OAuth-svaret som `?code=…` i query-strängen
  i stället för `#access_token=…`, och krockar inte med `HashRouter`.
- Redirect-URL:er i Supabase Auth: `https://djyret.github.io/mnm-items/` och `http://localhost:5173/mnm-items/`.
- Mejl-providern stängs av, bara Discord är aktiv.
- Manuellt (Daniel): skapa app i Discord Developer Portal med redirect
  `https://zqdccfjisvkovuikrick.supabase.co/auth/v1/callback`, och lägg client id och secret under Auth → Providers → Discord.
- Ingen `service_role`-nyckel i frontend, repo eller GitHub Actions.

## Utrullning

| Steg | Innehåll | Bryter något? |
|---|---|---|
| **1** | `memberships`, audit, hjälpfunktioner, trigger, Discord-inloggning i UI, sida **Medlemmar** (admin godkänner, sätter roll, spärrar), bootstrap av admin | Nej, rent additivt |
| *mellan 1 och 2* | Alla i gänget loggar in och godkänns som Editor | Görs annars inte det tappar de skrivrätten i steg 2 |
| **2** | Ta bort öppna policyer, `can_edit()` på skrivning (tabeller och buckets), Edge Functions på användartoken plus kvot, gängordet bort, UI döljer redigering för icke-Editors | Ja: ej inloggade kan inte längre skriva (avsikten) |
| **3** | `visibility` på kapitel, privat `kronikan`, signerade URL:er, väljare för synlighet i verkstaden | Läsvyer för bilder skrivs om |

Sedan: språkval sv/en, därefter Armory.

## Acceptanstester

Körs mot REST/Storage/Functions direkt, inte bara via UI. Sparas som skript (`scripts/check-access.mjs`) med en
testanvändare per roll.

- [ ] Anon: insert/update/delete/upload på varje tabell och bucket nekas.
- [ ] Anon: SELECT ger bara publika kapitel och deras minnen (steg 3).
- [ ] Inloggad `pending`: samma som anon.
- [ ] Reader: läser gruppkapitel, alla skrivningar och AI-anrop nekas.
- [ ] Editor: skriver allt innehåll, kan inte ändra `memberships` direkt eller via metadata, kan inte anropa `admin_set_membership`.
- [ ] Editor över kvot: `429` och inget modellanrop.
- [ ] Admin: godkänner, byter roll, spärrar. Spärrad användare nekas direkt vid nästa anrop.
- [ ] Sista admin kan inte degradera sig själv.
- [ ] Discord-inloggning, siduppdatering, utloggning och utgången session fungerar på GitHub Pages-URL:en.
- [ ] Gamla kapitel, bildspel och djuplänkar (`#/kronikan/:id`) fungerar efter steg 3.

## Dokument att uppdatera när det byggs

- `PRODUCT.md`: "Ingen inloggning: alla med länken kan läsa och skriva" ändras i steg 2.
- `README.md`: setup för Discord-provider och första admin.
