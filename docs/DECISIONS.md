# Beslut

Låsta beslut för roadmap v2 (`docs/ROADMAP.md`). Roadmapen är input; det här är vad vi faktiskt bestämt.
Nya beslut läggs överst i respektive avsnitt med datum. Ändrar ett beslut något i `PRODUCT.md` eller `DESIGN.md`
uppdateras de i samma PR som koden.

## Låsta

| Datum | Ämne | Beslut | Kommentar |
|---|---|---|---|
| 2026-11-21 | Wikin | Item-uppslag mot **Monsters and Memories Wikis partner-API** (nyckel från Gromple, secret `MNM_WIKI_KEY`) via Edge Function `wiki-item`, bara för redaktörer och utan AI-kvot. Används för: sök och fyll i nytt item, automatisk länk vid exakt namnträff efter avläsning, "Länka till wikin" på itemsidan (fyller bara tomma fält). Items sparar `wiki_id`, `wiki_url`, `wiki_icon`. | Villkor: bara uppslag, ingen spegling; källhänvisning med länk där datan visas (sidfot och vid wikidata) och länk till itemets wikisida. Wikins ikon används när itemet saknar egen. Enchants finns inte på wikin (de sätts av spelaren). |
| 2026-11-20 | Enchants | Spelets gröna rad "Enchant Necklace: Greater Wisdom +4 WIS" sparas i `items.enchant_name` + `enchant_stats`, skilt från itemets stats. Statsrutan i Armory lägger ihop båda. Avläsningen fyller i den; den går att skriva in för hand. | I spelets tooltip står enchanten skild från grundstatsen (Vambrace: WIS +8 och Enchant +3 WIS). Armorys statsruta visar bara gearens bonus, inte karaktärens grundvärden. |
| 2026-11-20 | Armory: utrustning | Varje utrustat item läggs in som item (skärmdump, AI-avläsning) och placeras i en slot. `items.equipped_slot` är enda sanningen; statusen Utrustad följer automatiskt. Ingen separat `character_equipment`-tabell. | Avsteg från roadmap §17.3: med ett 20-tal items räcker en kolumn + trigger. Historiken är `item_events` (`utrustad`/`avtagen` med slot och nivå). |
| 2026-11-20 | Armory: lån | Ett utlånat item får sitta på **låntagaren**. Det står kvar som utlånat från ägaren. | Lämnas det tillbaka eller flyttas tas det av automatiskt. |
| 2026-11-20 | Armory: omfång | Första versionen: porträtt (ett), paper doll, flikarna Utrustat/Förråd/Önskelista/Historik, utrustningens bonus och "hittades i kapitel" på items. Inte med: flera porträtt, jämförelse av uppgraderingar, wiki-uppslag. | Wiki-uppslag kommer när partnernyckeln från Monsters and Memories Wiki finns. EAR, WRIST och FINGER har två platser var. |
| 2026-11-20 | Namn | Sidan heter **Loot & Lore** (rimmar på *Monsters & Memories*), samma namn på svenska och engelska. Menyerna behåller egna namn per språk (Förrådet/The Stash, Krönikan/Chronicles). | Adress vid flytt: `lootandlore.pages.dev` (ledig 2026-11-20), ev. `lootandlore.se` senare (ingen DNS 2026-11-20, ej bekräftad hos registrar). Byte i UI görs ihop med språkvalet: `<title>`, headerbildens inmålade rubrik, footer. |
| 2026-11-20 | Hosting | GitHub Pages tills de stora förändringarna är klara. Därefter troligen Cloudflare Pages (`*.pages.dev`, ev. egen domän senare) och `BrowserRouter` utan `#`. | Flytten är bara konfiguration: ny adress i Supabase redirect-listan, `base: '/'`. Auth-koden är redan adressoberoende. |
| 2026-11-20 | Ordning | Säkerhet (fas 0) först, sedan språkval, sedan Character Armory. | Öppen anon-skrivning är det enda akuta. |
| 2026-11-20 | Backup | Backup innan policyer/tabeller ändras. Tagen 2026-11-20. | Lokalt, utanför repot: tabeller som JSON, båda buckets, migrationerna. |
| 2026-11-20 | Språk | Språkval **sv/en** i UI:t, standard efter webbläsaren (svensk → sv, annars en), valet sparas i webbläsaren. AI-texter (krönika, saga, pratbubblor) skrivs på språket hos **den som klickar**. | Inte helt engelska. Historiskt innehåll (krönikor, citat) översätts inte. Texter i `web/src/lib/i18n/strings/`. Målade bilder per språk (header-sv/en, `ikoner/meny/en/`) gjordes med ChatGPT. |
| 2026-11-20 | Roller | Fyra nivåer enligt roadmap §7: **Visitor, Reader, Editor, Admin**. | Visitor = ej inloggad eller utan aktivt medlemskap. |
| 2026-11-20 | Inloggning | **Discord OAuth** via Supabase Auth. Ingen mejl/lösenord. | Alla i gänget har Discord. |
| 2026-11-20 | Editor-omfång | Editor får ändra **allt delat innehåll** (items, karaktärer, krönikor). Inget ägarskap per post i fas 0. | Passar ett gäng utan enskild redaktör. Ägarskap kan läggas till med Armory. |
| 2026-11-20 | Nya konton | Discord-inloggning skapar ett medlemskap med status `pending`. Admin godkänner och sätter roll. | Ett Discord-konto ger aldrig läs- eller skrivrätt av sig självt. |

| 2026-11-20 | Synlighet | **Krönikekapitel** har egen synlighet: `public` / `group` / `draft`. Minnen ärver. | Steg 3. |
| 2026-11-20 | Adminpanel | Sidan **Admin** (`#/admin`): lägsta roll per **område** (Förrådet = items/karaktärer/alts/försäljning, Krönikan = tak över kapitlens synlighet + rollistan, Stilbibeln = stilprompten), kapitellista med synlighet, medlemmar. Spärras i databasen (`area_access`, `can_view_area()`). Alla områden startar öppna för alla. | Per område, inte per sida: sidor som delar data kan inte skyddas var för sig. |
| 2026-11-20 | Befintliga kapitel | De 23 kapitel som fanns 2026-11-20 blev **publika**. Nya kapitel blir `group` som standard. | Daniel valde publik framför gruppinternt. |
| 2026-11-20 | Utkast | `draft` syns för **alla redaktörer** (verkstaden är gemensam), inte för läsare eller besökare. Ingen ägare per kapitel. | `created_by` sparas ändå för framtida bruk. |
| 2026-11-20 | Bilder i gruppkapitel | **Hemliga adresser**, inte privat bucket: `kronikan` förblir publik, men besökare kan inte lista den, och bildnamnen är slumpade uuid som bara syns för den som får läsa minnet. | Medvetet avsteg från roadmap §18.3. Nackdel: en delad bildlänk går inte att återkalla. Privat bucket + signerade URL:er kan byggas senare (~25 ställen i webben + båda AI-funktionerna). |

## Föreslagna (inte låsta)

Rekommendationer i `docs/SECURITY_MODEL.md`. Bekräfta eller ändra innan respektive steg byggs.

| Ämne | Förslag | Behövs till |
|---|---|---|
| Radering | Hård radering för Editors i fas 0. Backup är återställningsvägen. Soft-delete senare. | Steg 2 (byggt så, ändras lätt) |
| AI-kvot | Per användare och dygn: `parse-item` 100, `berattelse` 20, `seriebild` 20. Misslyckade anrop räknas också. | Steg 2 (byggt så, siffrorna i `ai_daily_limit()`) |
