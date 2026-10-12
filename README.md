# MnM Förrådet

Itemförråd för vårt gäng i Monsters & Memories. Klistra in en screenshot på statsrutan, så läser Claude Haiku av den och itemet sparas med karaktär och status.

- **Webb:** https://djyret.github.io/mnm-items/ (React + Vite, `web/`)
- **Databas och bilder:** Supabase-projektet *MnM Items* (`supabase/migrations/`)
- **Avläsning:** Edge Function `supabase/functions/parse-item` (kräver secret `ANTHROPIC_API_KEY`)

## Utveckla lokalt

```
cd web
npm install
npm run dev
```

## Publicera

- Webb: push till `main` → GitHub Actions bygger och publicerar.
- Databas: `npx supabase db push --linked`
- Avläsning: `npx supabase functions deploy parse-item`
