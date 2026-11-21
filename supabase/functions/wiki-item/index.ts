// Uppslag mot Monsters and Memories Wikis partner-API (nyckeln är secret MNM_WIKI_KEY och lämnar
// aldrig servern). Villkor: bara uppslag, ingen spegling; visa "Data from the Monsters and Memories
// Wiki" med länk och länka varje item till sin wikisida (görs i webben).
//
// POST { action: "search", q }  -> { results: [{ id, name, url, icon, slot }] }
// POST { action: "item", id }   -> { item: ParsedItem, wiki: { id, url, icon, gameLinkId } }
// item har samma form som parse-item returnerar, så webben fyller formuläret på samma sätt.
import { cors, json, requireEditor } from "../_shared/auth.ts";

const API = "https://monstersandmemories.wiki/api/partner/v1";

type Part = { label: string | null; value: string };
interface WikiItem {
  id: string;
  name: string;
  url: string;
  icon: string | null;
  slot: string[];
  gameLinkId: string | null;
  windowParts?: Part[][];
  weight: number | null;
  size: string | null;
  skill: string | null;
  effects: string[];
  classes: string[];
  races: string[];
  description: string | null;
  flags: string[];
}

// Etiketter i spelets itemfönster -> våra statnycklar
const LABEL_KEY: Record<string, string> = {
  "Weapon DMG": "DMG", "ATK Delay": "DLY", "Range": "RANGE",
  HP: "HP", Health: "HP", Mana: "MANA", Endurance: "END",
};
// Rader som har egna fält eller inte är stats
const SKIP = new Set(["Slot", "Weight", "Size", "Class", "Race", "Skill", "DMG Ratio", "AC", "Effect"]);

function statKey(label: string): string {
  return LABEL_KEY[label] ?? label.trim().toUpperCase().replace(/[\s:]+/g, "_");
}

function toParsed(w: WikiItem) {
  const stats: { key: string; value: number }[] = [];
  const extra: string[] = [];
  let ac: number | null = null;
  const flags = w.flags.map((f) => f.toUpperCase());

  for (const row of w.windowParts ?? []) {
    for (const { label, value } of row) {
      if (label === null) {
        // Flaggor (MAGIC …) och fristående ord som "Two Handed"
        if (!flags.includes(value.toUpperCase())) extra.push(value);
        continue;
      }
      if (label === "AC") {
        ac = Number.parseInt(value, 10);
        continue;
      }
      if (SKIP.has(label)) continue;
      const n = Number(value.replace(/^\+/, ""));
      if (Number.isFinite(n)) stats.push({ key: statKey(label), value: n });
      else extra.push(`${label}: ${value}`);
    }
  }
  if (w.skill) extra.push(`Skill: ${w.skill}`);

  return {
    name: w.name,
    flags,
    slots: w.slot.map((s) => s.toUpperCase()),
    ac: Number.isFinite(ac) ? ac : null,
    stats,
    effect: w.effects[0] ?? null,
    description: w.description,
    weight: w.weight,
    size: w.size,
    classes: w.classes,
    races: w.races,
    extra_lines: extra,
    enchant: null,
    icon_box: null,
  };
}

async function wiki(path: string): Promise<Response> {
  const key = Deno.env.get("MNM_WIKI_KEY");
  if (!key) return json({ error: "Wikinyckeln saknas på servern." }, 500);
  return fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${key}` } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Endast POST" }, 405);
  const denied = await requireEditor(req);
  if (denied) return denied;

  const { action, q, id } = await req.json().catch(() => ({}));
  try {
    if (action === "search" && typeof q === "string" && q.trim()) {
      const res = await wiki(`/search?type=item&limit=8&q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) return json({ error: `Wikin svarade ${res.status}` }, 502);
      const body = await res.json();
      const results = (body.results ?? []).map((r: WikiItem) => ({
        id: r.id, name: r.name, url: r.url, icon: r.icon, slot: r.slot ?? [],
      }));
      return json({ results });
    }
    if (action === "item" && typeof id === "string" && id) {
      const res = await wiki(`/item/${encodeURIComponent(id)}`);
      if (res.status === 404) return json({ error: "Itemet finns inte på wikin." }, 404);
      if (!res.ok) return json({ error: `Wikin svarade ${res.status}` }, 502);
      const w: WikiItem = await res.json();
      return json({ item: toParsed(w), wiki: { id: w.id, url: w.url, icon: w.icon, gameLinkId: w.gameLinkId } });
    }
    return json({ error: "Okänd förfrågan" }, 400);
  } catch (e) {
    return json({ error: `Wikin gick inte att nå: ${(e as Error).message}` }, 502);
  }
});
