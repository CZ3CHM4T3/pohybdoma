import { NextResponse } from "next/server";
import { getVideoBySlug } from "@/lib/content-server";
import { getUserTier } from "@/lib/supabase/user";
import { canAccess } from "@/lib/access";
import { signStreamToken, streamSigningConfigured } from "@/lib/stream-token";

// Vydává přehrávací token pro Cloudflare Stream AŽ po serverovém ověření, že
// přihlášený uživatel na dané video (podle úrovně členství) má. cf_uid se tak
// do prohlížeče dostane jen u videa, které uživatel smí přehrát, a jen jako
// krátkodobý podepsaný token (když je zapnuté podepisování).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const video = await getVideoBySlug(slug);
  if (!video || !video.providerId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const tier = await getUserTier();
  if (!canAccess(tier, video.accessLevel)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const signed = await signStreamToken(video.providerId);
  // Fallback: dokud není nastavené podepisování (a zapnuté „Require signed URLs"
  // v Cloudflare), vracíme holé cf_uid – ale jen uživateli, který na video má.
  const token = signed ?? video.providerId;

  return NextResponse.json(
    { token, signed: streamSigningConfigured() },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
