import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/user";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

// Správa osobních videí klientů (admin). Nahrávání jde přímo z prohlížeče do
// Cloudflare Stream přes jednorázový „direct upload" odkaz – video tak neteče
// přes náš server (obchází limit velikosti serverless funkce) a CF token zůstává
// jen na serveru.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CF_ACCOUNT = process.env.CF_STREAM_ACCOUNT_ID;
const CF_TOKEN = process.env.CF_STREAM_API_TOKEN;
const cfConfigured = () => Boolean(CF_ACCOUNT && CF_TOKEN);

// POST = vytvoř jednorázový nahrávací odkaz do Cloudflare Stream.
export async function POST(req: Request) {
  const u = await getSessionUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!cfConfigured()) return NextResponse.json({ error: "cf_not_configured" }, { status: 503 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const title = String(body.title ?? "").slice(0, 200);
  const maxDurationSeconds = Math.min(Math.max(Number(body.maxDurationSeconds) || 600, 60), 3600);

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream/direct_upload`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        maxDurationSeconds,
        requireSignedURLs: true, // chráněné – přehraje jen podepsaný odkaz
        meta: { name: title || "POHYB DOMA – osobní video" },
      }),
    }
  );
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success || !data?.result?.uploadURL) {
    return NextResponse.json({ error: "cf_error", detail: data?.errors ?? null }, { status: 502 });
  }
  return NextResponse.json(
    { uploadURL: data.result.uploadURL, uid: data.result.uid },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// PUT = ulož video k danému klientovi (až po úspěšném nahrání do Cloudflare).
export async function PUT(req: Request) {
  const u = await getSessionUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!adminConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const client_id = String(body.client_id ?? "");
  const cf_uid = String(body.cf_uid ?? "");
  const title = String(body.title ?? "").slice(0, 200) || null;
  const note = String(body.note ?? "").slice(0, 2000) || null;
  if (!client_id || !cf_uid) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("client_videos")
    .insert({ client_id, cf_uid, title, note })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

// DELETE ?id=... = smaž video z DB i z Cloudflare (admin).
export async function DELETE(req: Request) {
  const u = await getSessionUser();
  if (!u?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!adminConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = createAdminClient();
  const { data: row } = await db.from("client_videos").select("cf_uid").eq("id", id).maybeSingle();
  await db.from("client_videos").delete().eq("id", id);
  if (row?.cf_uid && cfConfigured()) {
    await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream/${row.cf_uid}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${CF_TOKEN}` },
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
