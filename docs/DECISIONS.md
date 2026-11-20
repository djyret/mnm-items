# Beslut

Låsta beslut för roadmap v2 (`docs/ROADMAP.md`). Roadmapen är input; det här är vad vi faktiskt bestämt.
Nya beslut läggs överst i respektive avsnitt med datum. Ändrar ett beslut något i `PRODUCT.md` eller `DESIGN.md`
uppdateras de i samma PR som koden.

## Låsta

| Datum | Ämne | Beslut | Kommentar |
|---|---|---|---|
| 2026-11-20 | Ordning | Säkerhet (fas 0) först, sedan språkval, sedan Character Armory. | Öppen anon-skrivning är det enda akuta. |
| 2026-11-20 | Backup | Backup innan policyer/tabeller ändras. Tagen 2026-11-20. | Lokalt, utanför repot: tabeller som JSON, båda buckets, migrationerna. |
| 2026-11-20 | Språk | Språkval **sv/en** i UI:t. Svenska förblir standard. | Inte helt engelska. Historiskt innehåll (krönikor, citat) översätts inte. |
| 2026-11-20 | Roller | Fyra nivåer enligt roadmap §7: **Visitor, Reader, Editor, Admin**. | Visitor = ej inloggad eller utan aktivt medlemskap. |
| 2026-11-20 | Inloggning | **Discord OAuth** via Supabase Auth. Ingen mejl/lösenord. | Alla i gänget har Discord. |
| 2026-11-20 | Editor-omfång | Editor får ändra **allt delat innehåll** (items, karaktärer, krönikor). Inget ägarskap per post i fas 0. | Passar ett gäng utan enskild redaktör. Ägarskap kan läggas till med Armory. |
| 2026-11-20 | Nya konton | Discord-inloggning skapar ett medlemskap med status `pending`. Admin godkänner och sätter roll. | Ett Discord-konto ger aldrig läs- eller skrivrätt av sig självt. |

## Föreslagna (inte låsta)

Rekommendationer i `docs/SECURITY_MODEL.md`. Bekräfta eller ändra innan respektive steg byggs.

| Ämne | Förslag | Behövs till |
|---|---|---|
| Vad har synlighet | Bara **krönikekapitel** får `visibility` (public/group/draft). Minnen och bilder ärver från kapitlet. Items, karaktärer, rollista och stilbibel är alltid publika att läsa. | Steg 3 |
| Befintliga kapitel | Sätts till `group` vid migrering. Admin publicerar valda kapitel som `public` i efterhand. | Steg 3 |
| Utkast | `draft` syns för alla Editors/Admins (verkstaden är gemensam), inte för Readers. | Steg 3 |
| Radering | Hård radering för Editors i fas 0. Backup är återställningsvägen. Soft-delete senare. | Steg 2 |
| AI-kvot | Per användare och dygn: `parse-item` 100, `berattelse` 20, `seriebild` 20. | Steg 2 |
