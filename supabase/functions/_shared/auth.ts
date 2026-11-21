// Behörighet för AI-funktionerna: anroparen måste vara inloggad, aktiv redaktör och ha kvot kvar.
// All databas- och Storage-åtkomst går med anroparens egen token, så RLS och Storage-policyer gäller.

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export interface Caller {
  userId: string;
  /** Supabase-URL:en, för Storage-adresser */
  base: string;
  /** Headers som ger anroparens rättigheter mot REST och Storage */
  headers: Record<string, string>;
  /** GET mot PostgREST som anroparen, t.ex. db("chronicle_entries?id=eq.…") */
  db: (path: string) => Promise<any>;
  /** Markera anropet som lyckat/misslyckat i ai_usage (bara logg) */
  finish: (success: boolean) => Promise<void>;
}

type Fn = "parse-item" | "berattelse" | "seriebild";

/** Returnerar anroparen, eller ett färdigt felsvar (401/403/429) att skicka tillbaka direkt. */
export async function authorize(req: Request, fn: Fn): Promise<Caller | Response> {
  const base = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || token === anon) {
    return json({ error: "Logga in med Discord för att använda AI-funktionerna.", code: "auth" }, 401);
  }
  const headers = { apikey: anon, Authorization: `Bearer ${token}` };

  const who = await fetch(`${base}/auth/v1/user`, { headers });
  if (!who.ok) return json({ error: "Inloggningen har gått ut. Logga in igen.", code: "auth" }, 401);
  const { id: userId } = await who.json();

  const rpc = (name: string, args: unknown) =>
    fetch(`${base}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });

  // Kontrollerar redaktörsroll och kvot i ett steg, och bokar anropet
  const start = await rpc("ai_usage_start", { fn });
  if (!start.ok) {
    const err = await start.json().catch(() => ({}));
    if (err.hint === "quota") return json({ error: err.message, code: "quota" }, 429);
    if (err.code === "42501") return json({ error: err.message, code: "forbidden" }, 403);
    return json({ error: `Kunde inte kontrollera behörighet: ${err.message ?? start.status}` }, 500);
  }
  const usageId: number = await start.json();

  return {
    userId,
    base,
    headers,
    db: async (path: string) => {
      const r = await fetch(`${base}/rest/v1/${path}`, { headers });
      if (!r.ok) throw new Error(`Databasen svarade ${r.status}: ${await r.text()}`);
      return r.json();
    },
    finish: async (success: boolean) => {
      await rpc("ai_usage_finish", { usage_id: usageId, success }).catch(() => {});
    },
  };
}

/**
 * Inloggad redaktör, utan AI-kvot (för uppslag som inte kostar AI, t.ex. wikin).
 * Returnerar null om det är okej, annars ett färdigt felsvar.
 */
export async function requireEditor(req: Request): Promise<Response | null> {
  const base = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || token === anon) return json({ error: "Logga in med Discord.", code: "auth" }, 401);
  const headers = { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const res = await fetch(`${base}/rest/v1/rpc/can_edit`, { method: "POST", headers, body: "{}" });
  if (res.status === 401) return json({ error: "Inloggningen har gått ut. Logga in igen.", code: "auth" }, 401);
  if (!res.ok || (await res.json()) !== true) return json({ error: "Bara redaktörer kan slå upp på wikin.", code: "forbidden" }, 403);
  return null;
}

/** Inloggad och godkänd i gänget (läsare eller mer), utan AI-kvot. null = okej, annars felsvar. */
export async function requireMember(req: Request): Promise<Response | null> {
  const base = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || token === anon) return json({ error: "Logga in med Discord.", code: "auth" }, 401);
  const headers = { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const res = await fetch(`${base}/rest/v1/rpc/is_member`, { method: "POST", headers, body: "{}" });
  if (res.status === 401) return json({ error: "Inloggningen har gått ut. Logga in igen.", code: "auth" }, 401);
  if (!res.ok || (await res.json()) !== true) return json({ error: "Bara godkända medlemmar kan slå upp på wikin.", code: "forbidden" }, 403);
  return null;
}
