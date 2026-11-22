// Uppslag mot Monsters and Memories Wikis partner-API (nyckeln är secret MNM_WIKI_KEY och lämnar
// aldrig servern). Villkor: visa "Data from the Monsters and Memories Wiki" med länk och länka
// varje item till sin wikisida (görs i webben).
//
// POST { action: "search", q }  -> { results: [{ id, name, url, icon, slot }] }
// POST { action: "item", id }   -> { item: ParsedItem, wiki: { id, url, icon, gameLinkId, droppedBy, soldBy } }
// item har samma form som parse-item returnerar, så webben fyller formuläret på samma sätt.
import { cors, json, requireArmoryUser } from "../_shared/auth.ts";
import { source, toParsed, type WikiItem, wikiFetch } from "../_shared/wiki.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Endast POST" }, 405);
  const denied = await requireArmoryUser(req);
  if (denied) return denied;

  const { action, q, id } = await req.json().catch(() => ({}));
  try {
    if (action === "search" && typeof q === "string" && q.trim()) {
      const res = await wikiFetch(`/search?type=item&limit=8&q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) return json({ error: `Wikin svarade ${res.status}` }, 502);
      const body = await res.json();
      const results = (body.results ?? []).map((r: WikiItem) => ({
        id: r.id, name: r.name, url: r.url, icon: r.icon, slot: r.slot ?? [],
      }));
      return json({ results });
    }
    if (action === "item" && typeof id === "string" && id) {
      const res = await wikiFetch(`/item/${encodeURIComponent(id)}`);
      if (res.status === 404) return json({ error: "Itemet finns inte på wikin." }, 404);
      if (!res.ok) return json({ error: `Wikin svarade ${res.status}` }, 502);
      const w: WikiItem = await res.json();
      return json({
        item: toParsed(w),
        wiki: {
          id: w.id, url: w.url, icon: w.icon, gameLinkId: w.gameLinkId,
          droppedBy: (w.droppedBy ?? []).map(source),
          soldBy: (w.soldBy ?? []).map(source),
        },
      });
    }
    return json({ error: "Okänd förfrågan" }, 400);
  } catch (e) {
    return json({ error: `Wikin gick inte att nå: ${(e as Error).message}` }, 502);
  }
});
