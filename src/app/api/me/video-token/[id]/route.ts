import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveClientForUser } from "@/lib/client-link";
import { signStreamToken, streamSigningConfigured } from "@/lib/stream-token";

// Přehrávací token pro OSOBNÍ video. Server ověří, že video patří přihlášenému
// klientovi (nebo je to admin), a teprve pak vydá podepsaný token / holé cf_uid.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, client } = await resolveClientForUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data: row } = await db
    .from("client_videos")
    .select("cf_uid, client_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Přístup má admin, nebo klient, jemuž video patří.
  const owns = client && row.client_id === client.id;
  if (!user.isAdmin && !owns) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const signed = await signStreamToken(row.cf_uid);
  const token = signed ?? row.cf_uid;
  return NextResponse.json(
    { token, signed: streamSigningConfigured() },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
