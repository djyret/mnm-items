// Seriebild: gör en seriebild till ett ögonblick i Krönikan med OpenAI:s bildmodell.
// Tar emot { prompt, cast_names, source_ids } (eller entry_id, så läses de ur databasen). Karaktärernas referensbilder och skärmdumparna ögonblicket
// bygger på skickas med som bildunderlag. Bilden laddas upp i bucket kronikan och sökvägen
// returneras – klienten bestämmer själv när minnet ska peka på den.

const MODEL = "gpt-image-2.5-flare";
const SIZE = { width: 1536, height: 1024 };
// OpenAI tar högst 16 bilder per anrop
const MAX_REFS = 16;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-gang-word",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Endast POST" }, 405);
  // Gängordet skyddar API-nycklarna: utan det kan vem som helst med länken dra kostnader
  const word = Deno.env.get("GANG_WORD");
  if (!word || req.headers.get("x-gang-word") !== word) return json({ error: "Fel gängord", code: "gang_word" }, 401);

  try {
    const { entry_id, prompt, quality, cast_names, source_ids } = await req.json();
    if (typeof prompt !== "string" || prompt.trim().length < 20) return json({ error: "Prompten saknas" }, 400);

    const base = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_ANON_KEY")!;
    const openai = Deno.env.get("OPENAI_API_KEY");
    if (!openai) return json({ error: "OPENAI_API_KEY är inte satt i Supabase" }, 500);

    const db = async (path: string) => {
      const r = await fetch(`${base}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      if (!r.ok) throw new Error(`Databasen svarade ${r.status}: ${await r.text()}`);
      return r.json();
    };
    // Utkastet i editorn gäller före det som är sparat
    let entry = { cast_names: Array.isArray(cast_names) ? cast_names : [], source_ids: Array.isArray(source_ids) ? source_ids : [] };
    if (!Array.isArray(cast_names) && typeof entry_id === "string") {
      [entry] = await db(`chronicle_entries?id=eq.${encodeURIComponent(entry_id)}&select=cast_names,source_ids`);
      if (!entry) return json({ error: "Minnet finns inte" }, 404);
    }

    // Referenser i ordning: karaktärerna först, sedan skärmdumparna från ögonblicket
    const refs: { label: string; path: string }[] = [];
    if (entry.cast_names?.length) {
      const names = entry.cast_names.map((n: string) => `"${n.replaceAll('"', "")}"`).join(",");
      const cast = await db(`chronicle_cast?name=in.(${encodeURIComponent(names)})&select=name,ref_path`);
      for (const n of entry.cast_names) {
        const c = cast.find((x: { name: string }) => x.name === n);
        if (c?.ref_path) refs.push({ label: `reference image of ${n}`, path: c.ref_path });
      }
    }
    if (entry.source_ids?.length) {
      const ids = entry.source_ids.map(encodeURIComponent).join(",");
      const shots = await db(`chronicle_entries?id=in.(${ids})&select=id,image_path`);
      for (const id of entry.source_ids) {
        const s = shots.find((x: { id: string }) => x.id === id);
        if (s?.image_path) refs.push({ label: "in-game screenshot of the real moment", path: s.image_path });
      }
    }
    const used = refs.slice(0, MAX_REFS);

    const fullPrompt = used.length
      ? `Attached images, in order: ${used.map((r, i) => `${i + 1}) ${r.label}`).join("; ")}.\n\n${prompt}`
      : prompt;

    const common = {
      model: MODEL,
      prompt: fullPrompt,
      size: `${SIZE.width}x${SIZE.height}`,
      quality: ["low", "medium", "high"].includes(quality) ? quality : "high",
      output_format: "webp",
      output_compression: "88",
    };

    let res: Response;
    if (used.length) {
      const form = new FormData();
      for (const [k, v] of Object.entries(common)) form.append(k, v);
      for (const [i, r] of used.entries()) {
        const img = await fetch(`${base}/storage/v1/object/public/kronikan/${r.path}`);
        if (!img.ok) throw new Error(`Kunde inte hämta referensbild ${r.path}`);
        form.append("image[]", new File([await img.arrayBuffer()], `ref-${i + 1}.webp`, { type: "image/webp" }));
      }
      res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${openai}` },
        body: form,
      });
    } else {
      res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${openai}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...common, output_compression: 88 }),
      });
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = body?.error?.message ?? `OpenAI svarade ${res.status}`;
      const blocked = body?.error?.code === "moderation_blocked";
      return json({ error: blocked ? `OpenAI stoppade bilden: ${msg}` : msg }, blocked ? 422 : 502);
    }
    const b64 = body?.data?.[0]?.b64_json;
    if (!b64) return json({ error: "Inget bildsvar från OpenAI" }, 502);

    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `${crypto.randomUUID()}.webp`;
    const up = await fetch(`${base}/storage/v1/object/kronikan/${path}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "image/webp", "cache-control": "max-age=31536000" },
      body: bytes,
    });
    if (!up.ok) throw new Error(`Uppladdning misslyckades: ${await up.text()}`);

    return json({ path, width: SIZE.width, height: SIZE.height, model: MODEL, refs: used.length, usage: body.usage ?? null });
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
