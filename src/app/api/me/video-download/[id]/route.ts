import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveClientForUser } from "@/lib/client-link";
import { signStreamToken } from "@/lib/stream-token";

// Stáhnout OSOBNÍ video jako MP4. Server ověří vlastnictví, v Cloudflare povolí
// stahování (vytvoří MP4) a vrátí odkaz. MP4 se v CF připravuje chvíli – dokud
// není "ready", vracíme status a klient to za okamžik zkusí znovu.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CF_ACCOUNT = process.env.CF_STREAM_ACCOUNT_ID;
const CF_TOKEN = process.env.CF_STREAM_API_TOKEN;
const cfConfigured = () => Boolean(CF_ACCOUNT && CF_TOKEN);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, client } = await resolveClientForUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!cfConfigured()) return NextResponse.json({ error: "cf_not_configured" }, { status: 503 });

  const db = createAdminClient();
  const { data: row } = await db
    .from("client_videos")
    .select("cf_uid, client_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const owns = client && row.client_id === client.id;
  if (!user.isAdmin && !owns) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Povol/zjisti stav MP4 (POST je bezpečný i opakovaně – vrací stávající stav).
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream/${row.cf_uid}/downloads`,
    { method: "POST", headers: { Authorization: `Bearer ${CF_TOKEN}` } }
  );
  const data = await res.json().catch(() => null);
  const def = data?.result?.default;
  if (!res.ok || !def?.url) {
    return NextResponse.json({ error: "cf_error" }, { status: 502 });
  }

  if (def.status !== "ready") {
    return NextResponse.json({ status: def.status, percent: def.percentComplete ?? 0 });
  }

  // U podepsaných videí přidej k MP4 odkazu token.
  const signed = await signStreamToken(row.cf_uid);
  const url = signed ? `${def.url}?token=${encodeURIComponent(signed)}` : def.url;
  return NextResponse.json({ status: "ready", url }, { headers: { "Cache-Control": "private, no-store" } });
}
