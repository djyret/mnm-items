// Gemensamt för wiki-item och wiki-index: anrop mot Monsters and Memories Wikis partner-API
// (nyckeln är secret MNM_WIKI_KEY och lämnar aldrig servern) och tolkning av ett item.

export const WIKI_API = "https://monstersandmemories.wiki/api/partner/v1";

export type Part = { label: string | null; value: string };
export interface WikiSource { name: string; url?: string }
export interface WikiItem {
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
  droppedBy?: WikiSource[];
  soldBy?: WikiSource[];
  quests?: { relation?: string }[];
}

/** "Fallen Pass\nSivah Arjun" -> { npc: "Sivah Arjun", zone: "Fallen Pass" } */
export function source(s: WikiSource) {
  const parts = String(s.name ?? "").split("\n").map((p) => p.trim()).filter(Boolean);
  return { npc: parts[parts.length - 1] ?? "", zone: parts.length > 1 ? parts[0] : null, url: s.url ?? null };
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

/** Wikins item i samma form som parse-item returnerar. */
export function toParsed(w: WikiItem) {
  const stats: { key: string; value: number }[] = [];
  const extra: string[] = [];
  let flavor: string | null = null;
  let ac: number | null = null;
  const flags = (w.flags ?? []).map((f) => f.toUpperCase());

  for (const row of w.windowParts ?? []) {
    for (const { label, value } of row) {
      if (label === null) {
        // Flaggor (MAGIC …) och fristående ord som "Two Handed"
        if (flags.includes(value.toUpperCase())) continue;
        // Flavor-text står utan etikett i fönstret: en mening med gemener och flera ord
        if (/[a-z]/.test(value) && value.trim().split(/\s+/).length >= 4) flavor ??= value;
        else extra.push(value);
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
    slots: (w.slot ?? []).map((s) => s.toUpperCase()),
    ac: Number.isFinite(ac) ? ac : null,
    stats,
    effect: w.effects?.[0] ?? null,
    description: w.description ?? flavor,
    weight: w.weight,
    size: w.size,
    classes: w.classes ?? [],
    races: w.races ?? [],
    extra_lines: extra,
    enchant: null,
    icon_box: null,
  };
}

export async function wikiFetch(path: string): Promise<Response> {
  const key = Deno.env.get("MNM_WIKI_KEY");
  if (!key) throw new Error("Wikinyckeln saknas på servern.");
  return fetch(`${WIKI_API}${path}`, { headers: { Authorization: `Bearer ${key}` } });
}
