// Krönikören: läser ett kapitels skärmdumpar, seriebilder och anteckningar och skriver
// ett utkast på svenska – titel, sammanfattning, berättelse, bildtexter och förslag på
// seriescener. Tar emot { chapter_id, mode? } och läser resten själv ur databasen.
// mode "saga" skriver i stället kvällen som en längre, målande fantasysaga.
import Anthropic from "npm:@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";
// Fler bilder än så blir både dyrt och långsamt; resten skickas som text
const MAX_IMAGES = 60;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-gang-word",
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
      description: "Berättelsen om kvällen: 3–4 korta stycken separerade med en tom rad, högst cirka 170 ord totalt. Ingen rubrik, ingen markdown.",
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
Fatta dig kort: berättelsen läses på en pergamentrulle bredvid bilderna och ska rymmas utan att man behöver scrolla. Högst cirka 170 ord i 3–4 stycken. Bilderna berättar detaljerna; texten bär bara kvällens röda tråd och de bästa skämten.
Håll dig till det som faktiskt syns i bilderna och anteckningarna. Läs chattfönster, stridslogg, namnskyltar, partyfönster och zonnamn i skärmdumparna – där finns detaljerna. Hitta inte på händelser; fyll bara ut stämning och övergångar.
Skriv spelarnas karaktärer med sina namn. Använd spelets egna namn på platser, monster och föremål.
Husdjur får ett nytt namn varje gång de summonas; använd namnet som syns i bilden.
Minnena kommer i kronologisk ordning och är numrerade #1, #2 …; hänvisa till dem med de numren.
Föreslå seriescener för de bästa ögonblicken som ännu saknar seriebild – dramatiska, roliga eller vackra. Pratbubblorna ska vara korta och kännas som något någon faktiskt sa.`;

const SAGA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "saga"],
  properties: {
    title: { type: "string", description: "Sagans titel, som på ett kapitel i en gammal krönika" },
    saga: {
      type: "string",
      description:
        "Sagan, cirka 600–900 ord. Stycken separeras med en tom rad. 3–5 avsnitt som var och en börjar med en egen rad '## Avsnittets rubrik'. Ingen annan markdown.",
    },
  },
};

const SAGA_SYSTEM = `Du är Krönikören – en gammal bard i världen Monsters & Memories som för ett kompisgängs äventyr till pergament åt eftervärlden.
Efter varje spelkväll får du kvällens skärmdumpar, seriebilder och anteckningar, och skriver kvällen som en saga på svenska.

Det här är INTE en sammanfattning. Det är en berättelse som ska kunna läsas högt vid lägerelden:
- Berätta inifrån världen, i dåtid, som om allt verkligen hände. Nämn aldrig spelet, skärmdumpar, levlar som siffror, UI, chatt eller "spelare" – en level up är en ny styrka i armarna, en död är en död (och en återkomst från bindningsplatsen ett mirakel eller en förbannelse).
- Måla: ljus, väder, dofter, ljud från striden, kylan i en grotta, tyngden i en sköld. Visa i stället för att räkna upp.
- Ge karaktärerna inre liv: vad de fruktar, hoppas och tänker i ögonblicket. Låt dem tala – repliker från chatten och pratbubblorna vävs in som dialog.
- Bygg en båge: en inledning som sätter stämningen, en stegring mot kvällens farligaste eller största ögonblick, och ett slut som andas ut och pekar fram mot nästa äventyr.
- Värme och humor får finnas – klantigheter och panikflykter blir legender – men tonen är högstämd saga, inte sketch.
- Variera meningslängden. Korta meningar när det smäller, längre när det är stilla.

Trovärdighet: allt som faktiskt hände ska stämma – vem som var där, platser, fiender, dödsfall, flykter, fynd och vem som sa vad. Läs chattfönster, stridslogg, namnskyltar, partyfönster och zonnamn noga. Du får fritt fylla i stämning, tankar, miljö och små övergångar, men hitta inte på nya strider, fynd eller händelser som ändrar vad som hände.
Skriv karaktärerna med sina namn och använd spelets egna namn på platser, monster och föremål. Husdjur får ett nytt namn varje gång de kallas fram; använd namnet som syns i bilden.

Exempel på tonen (bara tonen – låna inga detaljer):
"Dimman låg tung över trapporna när de tre klev ut ur porten. Krigaren drog åt remmen på skölden och kände hur kölden bet genom handskarna. – Den här gången springer vi inte, sa han. Ingen svarade. Alla mindes förra gången."`;

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
  // Gängordet skyddar API-nycklarna: utan det kan vem som helst med länken dra kostnader
  const word = Deno.env.get("GANG_WORD");
  if (!word || req.headers.get("x-gang-word") !== word) return json({ error: "Fel gängord", code: "gang_word" }, 401);

  try {
    const { chapter_id, mode } = await req.json();
    if (typeof chapter_id !== "string") return json({ error: "chapter_id saknas" }, 400);
    const saga = mode === "saga";

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
      text: saga
        ? [
          chapter.story ? `Den korta krönikan som redan finns (håll dig till samma händelser):\n${chapter.story.replace(/\s*\((?:#[0-9a-f]{8}[,\s–-]*)+\)/g, "")}` : "",
          "Skriv kvällens saga enligt schemat.",
        ].filter(Boolean).join("\n\n")
        : "Skriv kvällens krönika enligt schemat. Bildtexter bara för minnen med bild som saknar bildtext.",
    });

    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
    const response = await client.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: saga ? SAGA_SYSTEM : SYSTEM,
      // Sagan får tänka mer: bågen och språket är hela poängen
      output_config: { effort: saga ? "high" : "medium", format: { type: "json_schema", schema: saga ? SAGA_SCHEMA : SCHEMA } },
      messages: [{ role: "user", content }],
    }).finalMessage();

    if (response.stop_reason === "refusal") return json({ error: "Modellen ville inte skriva krönikan" }, 422);
    if (response.stop_reason === "max_tokens") return json({ error: "Svaret blev för långt" }, 422);

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ error: "Inget svar från modellen" }, 502);

    const draft = JSON.parse(text.text);
    if (saga) {
      // Hänvisningar som (#3) hör inte hemma i en saga
      const clean = String(draft.saga).replace(/\s*\((?:#\d+[,\s–-]*)+\)/g, "");
      return json({
        saga: { title: draft.title, saga: clean },
        images_sent: images,
        images_total: entries.filter((e) => e.image_path).length,
        usage: response.usage,
      });
    }

    // Översätt minnesnummer till id:n
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
