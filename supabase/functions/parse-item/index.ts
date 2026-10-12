// Läser av en item-statsruta från Monsters & Memories med Claude Haiku.
// Tar emot { image: <base64>, media_type: "image/png" | "image/jpeg" | "image/webp" }
// och returnerar strukturerad JSON som webbappen fyller formuläret med.
import Anthropic from "npm:@anthropic-ai/sdk";

const MODEL = "claude-haiku-5-5";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "name", "flags", "slots", "ac", "stats", "effect", "description",
    "weight", "size", "classes", "races", "extra_lines", "icon_box",
  ],
  properties: {
    name: { type: "string", description: "Itemnamn i normal skiftläge, t.ex. 'Robe of the Undying Scholar'" },
    flags: { type: "array", items: { type: "string" }, description: "Raden med versala flaggor, t.ex. MAGIC, UNIQUE, NODROP, LORE" },
    slots: { type: "array", items: { type: "string" }, description: "Från 'Slot:', versaler, t.ex. CHEST eller [EAR, NECK]" },
    ac: { type: ["integer", "null"] },
    stats: {
      type: "array",
      description: "Alla numeriska stats utom AC/Weight. Nycklar: STR STA AGI DEX INT WIS CHA HP MANA END, resists som SV_FIRE SV_COLD SV_POISON SV_DISEASE SV_MAGIC SV_CORRUPTION SV_HOLY SV_ELEC, vapen som DMG (Weapon DMG) DLY (ATK Delay) RANGE. Övriga numeriska rader med versal nyckel och understreck.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "value"],
        properties: { key: { type: "string" }, value: { type: "number" } },
      },
    },
    effect: { type: ["string", "null"], description: "Hela effect-texten inkl. parentes, t.ex. 'Minor Intelligence (On Click. Any Slot. Cast Time: 5s. Level: 1)'" },
    description: { type: ["string", "null"], description: "Flavor-text" },
    weight: { type: ["number", "null"] },
    size: { type: ["string", "null"] },
    classes: { type: "array", items: { type: "string" }, description: "Klasskoder ENDAST från raden som börjar med 'Class:', eller ['ALL']. Tom lista om raden inte syns. 'Skill:' är vapentyp, inte klass." },
    races: { type: "array", items: { type: "string" }, description: "Från 'Race:', eller ['ALL']" },
    icon_box: {
      type: ["object", "null"],
      description: "Pixelruta runt itemets lilla ikon (bilden till vänster om textraderna, under rubriken). null om ingen ikon syns.",
      additionalProperties: false,
      required: ["x", "y", "width", "height"],
      properties: {
        x: { type: "integer" }, y: { type: "integer" },
        width: { type: "integer" }, height: { type: "integer" },
      },
    },
    extra_lines: { type: "array", items: { type: "string" }, description: "Information som inte passar i något annat fält, t.ex. 'Skill: BLG' för vapen. Upprepa aldrig sådant som redan finns i andra fält." },
  },
};

const PROMPT = `Bilden är en item-tooltip från MMO:t Monsters & Memories (EverQuest-liknande).
Läs av den exakt. Rubriken är itemnamnet (skrivet i kapitäler i bilden – återge det i normal skiftläge).
Hitta inte på värden som inte syns. Är texten avklippt längst ner, lämna de fälten tomma/null.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Endast POST" }, 405);

  try {
    const { image, media_type, width, height } = await req.json();
    if (typeof image !== "string" || image.length === 0) return json({ error: "Bild saknas" }, 400);
    if (image.length > 7_000_000) return json({ error: "Bilden är för stor" }, 413);
    const mediaType = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(media_type)
      ? media_type
      : "image/png";

    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
          {
            type: "text",
            text: width && height
              ? `${PROMPT}
Bilden är ${width}×${height} pixlar; ange icon_box i de koordinaterna (origo uppe till vänster).`
              : PROMPT,
          },
        ],
      }],
    });

    if (response.stop_reason === "refusal") return json({ error: "Modellen vägrade läsa bilden" }, 422);
    if (response.stop_reason === "max_tokens") return json({ error: "Svaret blev för långt" }, 422);

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ error: "Inget svar från modellen" }, 502);

    return json({ item: JSON.parse(text.text), usage: response.usage });
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
