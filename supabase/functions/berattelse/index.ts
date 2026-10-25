// Krönikören: läser ett kapitels skärmdumpar, seriebilder och anteckningar och skriver
// ett utkast på svenska – titel, sammanfattning, berättelse, bildtexter och förslag på
// seriescener. Tar emot { chapter_id } och läser resten själv ur databasen.
import Anthropic from "npm:@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";
// Fler bilder än så blir både dyrt och långsamt; resten skickas som text
const MAX_IMAGES = 60;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "story", "captions", "scenes"],
  properties: {
    title: { type: "string", description: "Kapiteltitel, kort och slagkraftig, gärna med glimten i ögat" },
    summary: { type: "string", description: "Kvällen i två–tre meningar, för tidslinjen" },
    story: {
      type: "string",
      description: "Berättelsen om kvällen, 4–10 stycken separerade med en tom rad. Ingen rubrik, ingen markdown.",
    },
    captions: {
      type: "array",
      description: "Bildtext för varje minne som har bild men saknar bildtext",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nr", "caption"],
        properties: {
          nr: { type: "integer", description: "Minnets nummer, t.ex. 3 för #3" },
          caption: { type: "string", description: "En–två meningar om vad som händer i bilden" },
        },
      },
    },
    scenes: {
      type: "array",
      description: "3–6 ögonblick som förtjänar en seriebild och som inte redan har en",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "caption", "cast_names", "pets", "quotes", "subzone", "source_nrs", "why"],
        properties: {
          title: { type: "string", description: "Kort namn på scenen" },
          caption: {
            type: "string",
            description: "Vad bilden ska visa: plats, vem som gör vad, stämning, komik. Konkret och visuellt, 2–4 meningar.",
          },
          cast_names: { type: "array", items: { type: "string" }, description: "Namn ur rollistan som syns i bilden" },
          pets: {
            type: "array",
            description: "Husdjur i bilden med namnet de hade den här gången (syns ofta i skärmdumparna)",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["cast", "name"],
              properties: { cast: { type: "string" }, name: { type: "string" } },
            },
          },
          quotes: {
            type: "array",
            description: "0–3 korta pratbubblor på svenska",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["who", "text"],
              properties: {
                who: { type: "string", description: "Namn ur rollistan, eller tom sträng för berättarruta" },
                text: { type: "string" },
              },
            },
          },
          subzone: { type: ["string", "null"], description: "Delområde om annat än kapitlets" },
          source_nrs: { type: "array", items: { type: "integer" }, description: "Numren på minnena scenen bygger på" },
          why: { type: "string", description: "En mening om varför just det här ögonblicket" },
        },
      },
    },
  },
};

const SYSTEM = `Du är krönikör för ett kompisgäng som spelar MMO:t Monsters & Memories (EverQuest-likt, gammaldags och svårt) tillsammans.
Efter varje spelkväll får du kvällens skärmdumpar, färdiga seriebilder och anteckningar, och skriver gängets krönika.

Ton: varm, humoristisk äventyrsberättelse på svenska, som en bardsaga berättad vid lägerelden. Skämta gärna om dödsfall, panikflykter och klantigheter – det är sådant gänget minns.
Håll dig till det som faktiskt syns i bilderna och anteckningarna. Läs chattfönster, stridslogg, namnskyltar, partyfönster och zonnamn i skärmdumparna – där finns detaljerna. Hitta inte på händelser; fyll bara ut stämning och övergångar.
Skriv spelarnas karaktärer med sina namn. Använd spelets egna namn på platser, monster och föremål.
Husdjur får ett nytt namn varje gång de summonas; använd namnet som syns i bilden.
Minnena kommer i kronologisk ordning och är numrerade #1, #2 …; hänvisa till dem med de numren.
Föreslå seriescener för de bästa ögonblicken som ännu saknar seriebild – dramatiska, roliga eller vackra. Pratbubblorna ska vara korta och kännas som något någon faktiskt sa.`;

interface Entry {
  id: string;
  kind: string;
  image_path: string | null;
  caption: string | null;
  quotes: { who: string; text: string }[];
  cast_names: string[];
  pet_names: Record<string, string>;
  subzone: string | null;
  url: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Endast POST" }, 405);

  try {
    const { chapter_id } = await req.json();
    if (typeof chapter_id !== "string") return json({ error: "chapter_id saknas" }, 400);

    const base = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_ANON_KEY")!;
    const db = async (path: string) => {
      const r = await fetch(`${base}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      if (!r.ok) throw new Error(`Databasen svarade ${r.status}: ${await r.text()}`);
      return r.json();
    };
    const [[chapter], entries, cast] = await Promise.all([
      db(`chronicle_chapters?id=eq.${encodeURIComponent(chapter_id)}&select=*`),
      db(`chronicle_entries?chapter_id=eq.${encodeURIComponent(chapter_id)}&select=*&order=position`) as Promise<Entry[]>,
      db(`chronicle_cast?select=name,role,look&order=position`),
    ]);
    if (!chapter) return json({ error: "Kapitlet finns inte" }, 404);
    if (!entries.length) return json({ error: "Kapitlet har inga minnen än" }, 400);

    const imageUrl = (p: string) => `${base}/storage/v1/object/public/kronikan/${p}`;
    let images = 0;
    const content: Anthropic.ContentBlockParam[] = [{
      type: "text",
      text: [
        `KAPITEL: ${chapter.title}`,
        `Spelkväll: ${chapter.played_on}`,
        `Zon: ${[chapter.zone, chapter.subzone].filter(Boolean).join(" – ") || "okänd"}`,
        chapter.summary ? `Nuvarande sammanfattning: ${chapter.summary}` : "",
        "",
        "ROLLISTA:",
        ...cast.map((c: { name: string; role: string; look: string }) =>
          `- ${c.name} (${c.role === "husdjur" ? "husdjur" : c.role === "npc" ? "NPC/fiende" : "spelarkaraktär"}): ${c.look}`
        ),
        "",
        "KVÄLLENS MINNEN, i ordning:",
      ].filter((l) => l !== "").join("\n"),
    }];

    entries.forEach((e, i) => {
      const label = { serie: "seriebild (redan gjord)", skarmdump: "skärmdump från spelet", anteckning: "anteckning", klipp: "klipp" }[e.kind] ?? e.kind;
      const pets = Object.entries(e.pet_names ?? {}).map(([k, v]) => `${v} (${k})`);
      const lines = [
        `#${i + 1} – ${label}`,
        e.caption ? `Bildtext: ${e.caption}` : "",
        e.cast_names.length ? `Med: ${[...e.cast_names.filter((n) => !(n in (e.pet_names ?? {}))), ...pets].join(", ")}` : "",
        e.quotes.length ? `Repliker: ${e.quotes.map((q) => `${q.who || "Berättare"}: "${q.text}"`).join(" / ")}` : "",
        e.subzone ? `Plats: ${e.subzone}` : "",
        e.url ? `Länk: ${e.url}` : "",
      ].filter(Boolean);
      if (e.image_path && images < MAX_IMAGES) {
        images++;
        content.push({ type: "text", text: lines.join("\n") });
        content.push({ type: "image", source: { type: "url", url: imageUrl(e.image_path) } });
      } else {
        if (e.image_path) lines.push("(bilden skickades inte med – för många bilder)");
        content.push({ type: "text", text: lines.join("\n") });
      }
    });

    content.push({
      type: "text",
      text: "Skriv kvällens krönika enligt schemat. Bildtexter bara för minnen med bild som saknar bildtext.",
    });

    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
    const response = await client.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content }],
    }).finalMessage();

    if (response.stop_reason === "refusal") return json({ error: "Modellen ville inte skriva krönikan" }, 422);
    if (response.stop_reason === "max_tokens") return json({ error: "Svaret blev för långt" }, 422);

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ error: "Inget svar från modellen" }, 502);

    // Översätt minnesnummer till id:n
    const draft = JSON.parse(text.text);
    const idOf = (nr: number) => entries[nr - 1]?.id;
    // Hänvisningar som (#3) pekar om på kort-id, så de håller när minnen läggs till eller flyttas
    const story = String(draft.story).replace(/#(\d+)/g, (m: string, nr: string) => {
      const id = idOf(Number(nr));
      return id ? `#${id.slice(0, 8)}` : m;
    });
    return json({
      draft: {
        title: draft.title,
        summary: draft.summary,
        story,
        captions: draft.captions
          .map((c: { nr: number; caption: string }) => ({ entry_id: idOf(c.nr), caption: c.caption }))
          .filter((c: { entry_id?: string }) => c.entry_id),
        scenes: draft.scenes.map((s: { source_nrs: number[]; pets: { cast: string; name: string }[] }) => ({
          ...s,
          source_ids: s.source_nrs.map(idOf).filter(Boolean),
          pet_names: Object.fromEntries(s.pets.map((p) => [p.cast, p.name])),
        })),
      },
      images_sent: images,
      images_total: entries.filter((e) => e.image_path).length,
      usage: response.usage,
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return json({ error: `Claude API ${err.status}: ${err.message}` }, 502);
    }
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
