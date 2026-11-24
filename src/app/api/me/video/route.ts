import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveClientForUser } from "@/lib/client-link";

// Osobní videa – NAHRÁVÁNÍ Z POHLEDU KLIENTA.
// Klient si může do své knihovničky přidat vlastní videa (např. ta, co mu Honza
// poslal do mobilu). Nahrává se přímo z prohlížeče do Cloudflare Stream (direct
// upload) – video neteče přes náš server a CF token zůstává jen na serveru.
// client_id se NIKDY nebere z těla požadavku – server si ho sám odvodí z toho,
// kdo je přihlášený (spárování karty klienta). Klient tak nemůže nahrát video
// někomu jinému.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CF_ACCOUNT = process.env.CF_STREAM_ACCOUNT_ID;
const CF_TOKEN = process.env.CF_STREAM_API_TOKEN;
const cfConfigured = () => Boolean(CF_ACCOUNT && CF_TOKEN);

// POST = jednorázový nahrávací odkaz do Cloudflare Stream (jen pro vlastní kartu).
export async function POST(req: Request) {
  const { user, client } = await resolveClientForUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!client) return NextResponse.json({ error: "no_client_card" }, { status: 403 });
  if (!cfConfigured()) return NextResponse.json({ error: "cf_not_configured" }, { status: 503 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const title = String(body.title ?? "").slice(0, 200);
  const maxDurationSeconds = Math.min(Math.max(Number(body.maxDurationSeconds) || 900, 60), 3600);

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream/direct_upload`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        maxDurationSeconds,
        requireSignedURLs: true,
        meta: { name: title || "POHYB DOMA – moje video" },
      }),
    }
  );
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success || !data?.result?.uploadURL) {
    return NextResponse.json({ error: "cf_error" }, { status: 502 });
  }
  return NextResponse.json(
    { uploadURL: data.result.uploadURL, uid: data.result.uid },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// PUT = ulož nahrané video ke své kartě (až po úspěšném nahrání do Cloudflare).
export async function PUT(req: Request) {
  const { user, client } = await resolveClientForUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!client) return NextResponse.json({ error: "no_client_card" }, { status: 403 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const cf_uid = String(body.cf_uid ?? "");
  const title = String(body.title ?? "").slice(0, 200) || null;
  if (!cf_uid) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("client_videos")
    .insert({ client_id: client.id, cf_uid, title, source: "client" })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

// DELETE ?id=... = smaž JEN své vlastní nahrané video (source='client').
// Klipy od Honzy (source='admin') klient mazat nemůže.
export async function DELETE(req: Request) {
  const { user, client } = await resolveClientForUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!client) return NextResponse.json({ error: "no_client_card" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = createAdminClient();
  const { data: row } = await db
    .from("client_videos")
    .select("cf_uid, client_id, source")
    .eq("id", id)
    .maybeSingle();
  if (!row || row.client_id !== client.id || row.source !== "client") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.from("client_videos").delete().eq("id", id);
  if (row.cf_uid && cfConfigured()) {
    await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream/${row.cf_uid}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${CF_TOKEN}` },
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
