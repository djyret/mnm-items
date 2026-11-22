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
| **Guest** | Aktivt medlemskap, roll `guest` (vän utanför gänget, 2026-11-22) | Som Visitor, + gruppkapitel och gästernas armory. **Inte** förrådet (`is_member()` är falsk) | Egna gästkaraktärer och deras set; skärmdumpsavläsning (30/dygn) |
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
- Undantag för startsidan: `set_my_main(char_id uuid)` (`security definer`, bara `authenticated`, kräver `is_member()`)
  sätter `main_character_id` på anroparens egen rad och inget annat. Roll och status kan inte ändras den vägen
  (migration `20261121150000_my_main`).
- SELECT på `memberships`: egen rad för alla inloggade, alla rader för admin.

### Hjälpfunktioner

`security definer`, `stable`, `set search_path = ''`. Används i alla policyer:

| Funktion | Sann när |
|---|---|
| `my_role()` | Returnerar roll om aktivt medlemskap, annars `null`. För en admin med **Visa som** (`view_as`) den valda rollen; `visitor` ger `null` |
| `is_member()` | Aktiv, `reader`, `editor` eller `admin` (sedan 2026-11-22 **inte** `guest`) |
| `is_guest()` | Aktiv, `guest` |
| `can_use_armory()` | `is_member()` eller `is_guest()`: gästernas armory och wikin |
| `owns_guest(g)` / `owns_guest_set(s)` | Anroparen äger gästkaraktären (eller settets karaktär), eller är admin |
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
| `forradet` | `characters`, `items`, `item_events`, `gear_sets`, `gear_set_items`, listning i `item-images` (även porträtt) |
| `kronikan` | `chronicle_chapters` (plus kapitlets `visibility`), `chronicle_entries` (via `can_read_chapter`), `chronicle_cast`, listning i `kronikan` |
| `stilbibeln` | `chronicle_settings` |
| `gaster` | `guest_characters`, `guest_sets`, `guest_set_items` (läsning **och** skrivning), gästernas skärmdumpsläsning |

Nivåerna (sedan 2026-11-22, `20261122130000_guest_area`): `visitor` (alla, även utloggade) < `guest` (inloggade
gäster och gänget) < `reader` (gänget) < `editor` < `admin`. Gäst är ett eget steg i stället för det tidigare
undantaget där gäster släpptes in i krönikan på `reader`. Området `gaster` startar på `guest`.

Skrivregler (`can_edit()`) påverkas inte, utom i `gaster` där även gästernas egna ändringar kräver att området syns. Saknas en rad i `area_access` ser bara admin området.
Webben döljer menyknappar och sidor via `useAreas()` / `RequireArea`, men det är databasen som spärrar.

### Armory (migration `20261120160000_armory`)

- `items.equipped_slot` är enda sanningen för utrustning. Triggern `items_equipment_sync` håller `status` i takt
  (slot ⇒ `equippad`, eller `utlanad` när låntagaren bär den) och rensar slotten när itemet byter bärare, säljs
  eller reserveras. `items_equipment_log` skriver `utrustad`/`avtagen` i `item_events` som anroparen, så RLS gäller.
- Unikt index: en karaktär bär högst ett item per slot.
- `equip_item(item, slot)` är `security invoker` (RLS avgör), körbar bara för `authenticated`; anon nekas.
- `wishlist` fanns här men togs bort 2026-11-21 (`20261121140000_drop_wishlist`); önskeseten ersätter den.

### Gäster (migration `20261122120000_guests`)

Vänner utanför gänget får egna karaktärer och önskeset utan att något hamnar i förrådet.

- Rollen `guest` i `app_role`. Admin väljer Gäst i Medlemmar innan kontot godkänns.
- `is_member()` räknar bara `reader`/`editor`/`admin`, så allt som kräver medlem (förrådet, `set_my_main`) är stängt.
  Gäster ser de områden som står på `visitor` eller `guest`; gruppkapitel läses med `is_member() or is_guest()`.
- Området `gaster` styr tabellerna nedan: läsning `can_view_area('gaster')` (även `anon`, som har select-grant men
  bara ser rader när området står på `visitor`); skrivning kräver dessutom området, och `owns_guest()` bär den kontrollen.
- Egna tabeller, ingen koppling till `characters`/`items`/`gear_sets`:

| Tabell | SELECT | INSERT | UPDATE / DELETE |
|---|---|---|---|
| `guest_characters` | `can_view_area('gaster')` | området och `owner_id = auth.uid()` och (`is_guest()` eller `can_edit()`) | området och (ägaren eller admin); `owner_id` kan inte ges bort |
| `guest_sets` | `can_view_area('gaster')` | `owns_guest(guest_id)` | `owns_guest(guest_id)` (även efter ändring) |
| `guest_set_items` | `can_view_area('gaster')` | `owns_guest_set(set_id)` | `owns_guest_set(set_id)` |

- `anon` har bara select (filtreras av området), aldrig skrivning. Gränser i triggers: 6 karaktärer per konto (admin undantagen), ett `now`-set
  (unikt index) och 4 önskeset per karaktär.
- `guest_set_items.icon` får bara vara en ikon från `https://monstersandmemories.wiki/` eller en inbäddad
  `data:image/(webp|png|jpeg);base64,` (urklippt ur skärmdumpen), så att gäster inte kan peka ut externa bilder.
  Inga gästfiler i Storage. `detail` (resten av tooltipen) är högst 20 kB; webben tvättar typerna innan visning.
- `ai_usage_start()` släpper in gäster för `parse-item` (inte `berattelse`/`seriebild`) när området `gaster` syns för dem, med 30 anrop per dygn.

### Setbyggaren (migration `20261122140000_wiki_index`)

| Tabell | SELECT | INSERT / UPDATE / DELETE |
|---|---|---|
| `wiki_items` | `can_use_armory()` (inloggad gäst eller medlem) | `is_admin()` |

- `anon` har inga rättigheter alls på `wiki_items`. Indexet är en kopia av wikins items som Gromple gav OK till för
  gängets bruk; det ska inte bli publikt. `url` och `icon` måste ligga på `https://monstersandmemories.wiki/`, `id` är en slug.
- `stat_points` på `characters` och `guest_characters` följer tabellens vanliga skrivregler (redaktör respektive ägaren)
  och kontrolleras av `valid_stat_points()`: bara STR/STA/DEX/AGI/INT/WIS/CHA, heltal ≥ 0, högst 10 totalt.
  Taket per ras och klass kontrolleras bara i webben (siffrorna kommer från wikin och kan ändras).

### Visa som (migration `20261122150000_view_as`)

- `memberships.view_as` (`visitor`, `guest`, `reader`, `editor` eller `null`). Läses av `my_role()` bara när den riktiga rollen är
  `admin`; ett kvarglömt läge hos någon som inte längre är admin gör ingenting.
- All behörighet går via `my_role()`, så en admin som visar sidan som läsare får läsarens rättigheter i RLS, RPC:er och
  edge-funktionerna (även `requireAdmin`). Adminpanelen syns alltså inte i det läget.
- `set_view_as(r)` (`security definer`) kontrollerar den **riktiga** rollen i `memberships`, så admin kommer alltid tillbaka,
  även från besökarläget. Användare har ingen update-rätt på `memberships`; kolumnen ändras bara via RPC:n. `anon` får inte anropa den.
- Webben laddar om sidan efter bytet. Väljaren finns i kontoraden och syns bara för riktiga admins.

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
aldrig till webbläsaren. `requireArmoryUser()` i `_shared/auth.ts` kräver inloggad, godkänd gäst eller medlem
(`can_use_armory()` via RPC, sedan 2026-11-22; tidigare `is_member()`) men bokar ingen AI-kvot, eftersom uppslag inte kostar AI. Wikins egen gräns är 120 anrop/minut per nyckel.
Funktionen skriver inget i databasen; webben sparar `wiki_id`/`wiki_url`/`wiki_icon` med användarens rättigheter.

### `wiki-index` (2026-11-22)

Fyller `wiki_items` för setbyggaren. `requireAdmin()` kräver inloggad admin (`is_admin()` via RPC), och
skrivningen går med adminens egen token mot PostgREST, så RLS gäller (ingen `service_role`). Webben styr körningen
i små anrop (`list` en sida av wikins itemlista, `fetch` högst 40 items) och funktionen håller sig runt 90 anrop/minut
mot wikin, under gränsen på 120, så att wikisöket fortsätter fungera medan indexet fylls. Tolkningen av ett item delas
med `wiki-item` i `_shared/wiki.ts`.

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
