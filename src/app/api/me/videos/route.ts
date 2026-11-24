import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveClientForUser } from "@/lib/client-link";

// Seznam osobních videí přihlášeného klienta. cf_uid se ven NEposílá –
// přehrání jde přes /api/me/video-token/<id>, které token podepíše na serveru.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, client } = await resolveClientForUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!client) return NextResponse.json({ videos: [], linked: false });

  const db = createAdminClient();
  const { data } = await db
    .from("client_videos")
    .select("id, title, note, source, created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(
    { videos: data ?? [], linked: true },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
