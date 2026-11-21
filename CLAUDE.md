# Loot & Lore (mnm-items)

Gängets förråd och krönika för MMO:t Monsters & Memories. React + Vite på GitHub Pages, Supabase (databas, Storage, Auth med Discord, Edge Functions med Claude).

Läs först:
- `PRODUCT.md` och `DESIGN.md`: vad appen är och hur den ser ut.
- `docs/DECISIONS.md`: låsta beslut. `docs/ROADMAP.md` är bara input; det som gäller står i DECISIONS.
- `docs/SECURITY_MODEL.md`: roller, hjälpfunktioner och policyer.

## Struktur

- `web/`: frontend. `src/pages/` sidor, `src/components/`, `src/lib/` (supabase-klient, auth, access, store, i18n, kronikan, items).
- `supabase/migrations/`: schema och RLS. `supabase/functions/`: `parse-item` (läser item-skärmdump), `berattelse` (krönika/saga), `seriebild`, `wiki-item` (uppslag mot Monsters and Memories Wiki, secret `MNM_WIKI_KEY`); gemensam `_shared/auth.ts`.
- `scripts/check-access.mjs`: kontrollerar vad en utloggad besökare får göra mot produktion.
- `web/public/bilder/` och `web/public/ikoner/meny/` (`en/` för engelska knappar): målade bilder.

## Kommandon

```
cd web && npm run dev      # http://localhost:5173/mnm-items/
cd web && npm run build    # tsc -b + vite build; kör före commit
cd web && npm run lint     # oxlint
node scripts/check-access.mjs   # efter varje ändring av policyer eller grants
```

Publicering: push till `main` bygger och publicerar via GitHub Actions. Edge Functions: `npx supabase@latest functions deploy <namn> --use-api --yes` (token från `.env`).

## Säkerhet och behörighet

- Roller: Visitor (utloggad/ej godkänd), Reader, Editor, Admin i `memberships`. Nya Discord-konton blir `pending` tills admin godkänner i `#/admin`.
- All behörighet avgörs i databasen (RLS). Frontendens `RequireEditor`, `EditorOnly` och `RequireArea` är bara bekvämlighet.
- Läsning: `can_view_area()` per område (`area_access`: forradet, kronikan, stilbibeln) och `can_read_chapter()` för kapitlens synlighet (public/group/draft). Skrivning: `can_edit()`.
- Edge Functions använder anroparens token mot REST/Storage via `authorize()` i `_shared/auth.ts`, aldrig `service_role`. AI-anrop räknas mot `ai_usage_start`/`ai_usage_finish`.
- Ingen `service_role`-nyckel i frontend. Läs aldrig ut värden ur `.env` i chatten; tokens används bara via skript.

## Migrationer

- Namn: `ÅÅÅÅMMDDHHMMSS_<namn>.sql`. Ny policy eller tabell ska följa mönstret i `20261120130000_lock_writes.sql` och `20261120150000_area_access.sql`.
- Körs mot produktion via Management API (`POST /v1/projects/zqdccfjisvkovuikrick/database/query`, `SUPABASE_ACCESS_TOKEN` i `.env`) eller `npx supabase db push --linked`.
- Torrkör först i `begin; … rollback;` med `set local role anon` och `request.jwt.claims` för att testa policyerna. Kör skarpt bara efter Daniels ja, och registrera sedan raden i `supabase_migrations.schema_migrations`.
- Facit över körda migrationer: valvet `verktyg/mnm-items-migrationer.md`. Status 2026-11-20: alla 20 filer i `supabase/migrations/` är körda; senaste `20261121150000_my_main.sql`.

## Språk (sv/en)

- All UI-text går via `useI18n().t('nyckel')`, utanför komponenter `translate(getLang(), …)`. Inga hårdkodade strängar i JSX.
- Ordböcker i `web/src/lib/i18n/strings/` per område. `sv` är källan (`as const`); `en` är typad mot den, så en saknad nyckel blir byggfel. Lägg alltid till båda.
- Etiketter som beror på språket slås upp vid rendering (t.ex. `statusLabel(s, lang)`), inte i kartor på modulnivå.
- Spelets egna namn (zoner, monster, items) stannar på engelska. Det gänget skrivit (krönikor, citat) översätts aldrig. AI-texter skrivs på språket hos den som klickar (`lang` skickas till `berattelse`).
- Målade bilder: tavernan är `taverna-band.webp` (överdel), `stolpe-vanster/hoger.webp` och `vagg.webp`; skylten per språk `skylt-sv/en.webp`; engelska menyknappar i `ikoner/meny/en/` och listade i `EN_MENU` i `App.tsx`. Nya målade bilder görs i ChatGPT: i T3 Code via `delegate_task` till Codex (`image_gen`), se `~/.claude/CLAUDE.md`.

## Arbetssätt

- Docs och kodkommentarer på svenska. Commits på engelska i Conventional Commits-form (`feat: …`, `fix: …`, `docs: …`). Identifierare som omgivande kod.
- Ändrar något produkten: uppdatera `PRODUCT.md`, `DESIGN.md` eller `docs/DECISIONS.md` i samma commit som koden.
- Inga emojis i commits.
- Subagenter som delar checkouten får inte köra git-kommandon som ändrar arbetskopian (stash, checkout, reset).
- Backup innan stora data- eller policyändringar (senaste: `D:\Projekt\mnm-items-backups\2026-11-20\`).
