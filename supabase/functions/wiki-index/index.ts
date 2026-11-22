// Fyller wiki_items, indexet som setbyggaren i Armory väljer ur. Gromple (wikins admin) gav
// 2026-11-22 OK till kopian för gängets begränsade bruk. Bara admin; skrivningarna går med
// adminens egen token, så RLS gäller (ingen service_role).
//
// Webben styr körningen i små steg (en Edge Function får inte gå i en timme):
// POST { action: "list", offset }   -> { entries: [{ id, updatedAt }], next: offset | null, total }
// POST { action: "fetch", items: [{ id, updatedAt }] } -> { saved, failed: [id] }   (högst 40 per anrop)
//
// Wikin tillåter 120 anrop i minuten per nyckel; vi håller oss runt 90 så att wikisöket i
// Armory fortsätter fungera medan indexet fylls.
import { cors, json, requireAdmin } from "../_shared/auth.ts";
import { toParsed, type WikiItem, wikiFetch } from "../_shared/wiki.ts";

const MAX_IDS = 40;
const GAP_MS = 650;
const WIKI_HOST = "https://monstersandmemories.wiki/";
// Slots som går att bära (BACKPACK, BAG, BELT m.fl. räknas inte)
const GEAR_SLOTS = new Set([
  "HEAD", "FACE", "EAR", "NECK", "SHOULDERS", "BACK", "CHEST", "SHIRT", "ARMS", "WRIST",
  "HANDS", "FINGER", "WAIST", "LEGS", "FEET", "PRIMARY", "SECONDARY", "RANGE", "AMMO",
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Hämtar ett item; väntar och försöker igen en gång om wikin säger 429. */
async function getItem(id: string): Promise<WikiItem | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await wikiFetch(`/item/${encodeURIComponent(id)}`);
    if (res.status === 429) {
      const wait = Number(res.headers.get("retry-after")) || 20;
      await sleep(Math.min(wait, 60) * 1000);
      continue;
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Wikin svarade ${res.status}`);
    return await res.json();
  }
  throw new Error("Wikin svarade 429");
}

function toRow(w: WikiItem, updatedAt: string | null) {
  const p = toParsed(w);
  const slots = p.slots.filter((s) => GEAR_SLOTS.has(s));
  const gear = slots.length > 0;
  const stats: Record<string, number> = {};
  for (const s of p.stats) stats[s.key] = s.value;
  const text = [w.skill ?? "", ...p.extra_lines].join(" ");
  const zones = [...new Set((w.droppedBy ?? []).map((d) => String(d.name ?? "").split("\n")[0].trim()).filter(Boolean))];
  const sources = [
    (w.droppedBy ?? []).length > 0 && "drop",
    (w.soldBy ?? []).length > 0 && "vendor",
    (w.quests ?? []).some((q) => q.relation === "reward") && "quest",
  ].filter(Boolean) as string[];
  return {
    id: w.id,
    name: w.name.slice(0, 200),
    url: w.url,
    icon: w.icon && w.icon.startsWith(WIKI_HOST) ? w.icon : null,
    slots,
    // Items utan slot sparas bara med namn, så att nästa körning vet att de är hämtade
    classes: gear ? p.classes.map((c) => c.trim().toUpperCase()).filter(Boolean) : [],
    races: gear ? p.races.map((r) => r.trim().toUpperCase()).filter(Boolean) : [],
    flags: gear ? p.flags : [],
    two_hand: gear && /\b(2H|two[ -]?hand(ed)?)\b/i.test(text),
    ac: gear ? p.ac : null,
    stats: gear ? stats : {},
    zones: gear ? zones.slice(0, 20) : [],
    sources: gear ? sources : [],
    wiki_updated_at: updatedAt,
    synced_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Endast POST" }, 405);
  const caller = await requireAdmin(req);
  if (caller instanceof Response) return caller;

  const { action, offset, items } = await req.json().catch(() => ({}));
  try {
    if (action === "list") {
      const off = Math.max(0, Math.floor(Number(offset) || 0));
      const res = await wikiFetch(`/items?limit=500&offset=${off}`);
      if (!res.ok) return json({ error: `Wikin svarade ${res.status}` }, 502);
      const body = await res.json();
      const list = (body.items ?? body.results ?? []) as { id: string; updatedAt?: string | null }[];
      const entries = list.map((e) => ({ id: e.id, updatedAt: e.updatedAt ?? null }));
      const total = Number(body.total) || null;
      const next = list.length === 500 && (!total || off + 500 < total) ? off + 500 : null;
      return json({ entries, next, total });
    }

    if (action === "fetch" && Array.isArray(items)) {
      const wanted = (items as { id?: unknown; updatedAt?: unknown }[])
        .filter((x) => typeof x?.id === "string" && /^[a-z0-9][a-z0-9-]*$/.test(x.id))
        .slice(0, MAX_IDS)
        .map((x) => ({ id: x.id as string, updatedAt: typeof x.updatedAt === "string" ? x.updatedAt : null }));
      // Nyckel på wikins id: ett omdöpt item kan svara med samma id som ett annat i batchen,
      // och Postgres vägrar uppdatera samma rad två gånger i ett kommando
      const rows = new Map<string, ReturnType<typeof toRow>>();
      const failed: string[] = [];
      for (const { id, updatedAt } of wanted) {
        const started = Date.now();
        try {
          const w = await getItem(id);
          if (w && /^[a-z0-9][a-z0-9-]*$/.test(w.id)) rows.set(w.id, toRow(w, updatedAt));
        } catch {
          failed.push(id);
        }
        const left = GAP_MS - (Date.now() - started);
        if (left > 0) await sleep(left);
      }
      if (rows.size > 0) {
        const res = await fetch(`${caller.base}/rest/v1/wiki_items?on_conflict=id`, {
          method: "POST",
          headers: { ...caller.headers, Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify([...rows.values()]),
        });
        if (!res.ok) return json({ error: `Databasen svarade ${res.status}: ${await res.text()}` }, 500);
      }
      return json({ saved: rows.size, failed });
    }

    return json({ error: "Okänd förfrågan" }, 400);
  } catch (e) {
    return json({ error: `Wikin gick inte att nå: ${(e as Error).message}` }, 502);
  }
});
