import { NextRequest } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Ověření podpisu Resend/Svix webhooku (whsec_… secret).
function verifySvix(secret: string, id: string, ts: string, body: string, sigHeader: string): boolean {
  if (!secret || !id || !ts || !sigHeader) return false;
  try {
    const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const expected = crypto.createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
    return sigHeader.split(" ").some((part) => {
      const sig = part.split(",")[1];
      if (!sig) return false;
      const a = Buffer.from(sig); const b = Buffer.from(expected);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    });
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET || "";
  const body = await req.text();
  const id = req.headers.get("svix-id") || "";
  const ts = req.headers.get("svix-timestamp") || "";
  const sig = req.headers.get("svix-signature") || "";

  if (!verifySvix(secret, id, ts, body, sig)) {
    return new Response("invalid signature", { status: 401 });
  }

  let evt: any;
  try { evt = JSON.parse(body); } catch { return new Response("bad json", { status: 400 }); }

  const type: string = evt?.type || "";
  const data = evt?.data || {};

  // Číslo faktury: primárně ze značky (tag invoice), jinak z předmětu „(č. 20260163)".
  let number: number | null = null;
  const tags = Array.isArray(data.tags) ? data.tags
    : (data.tags && typeof data.tags === "object" ? Object.entries(data.tags).map(([name, value]) => ({ name, value })) : []);
  const tag = tags.find((t: any) => t?.name === "invoice");
  if (tag?.value) number = Number(tag.value);
  if ((!number || Number.isNaN(number)) && typeof data.subject === "string") {
    const m = data.subject.match(/č\.\s*(\d{6,})/);
    if (m) number = Number(m[1]);
  }
  if (!number || Number.isNaN(number)) return new Response("no invoice ref", { status: 200 });

  const now = new Date().toISOString();
  const patch: Record<string, any> = {};
  if (type === "email.delivered") { patch.delivery_status = "delivered"; patch.delivered_at = now; }
  else if (type === "email.bounced") { patch.delivery_status = "bounced"; patch.bounced_at = now; }
  else if (type === "email.complained") { patch.delivery_status = "complained"; }
  else if (type === "email.opened") { patch.opened_at = now; }
  else return new Response("ignored", { status: 200 });

  const admin = createAdminClient();
  await admin.from("invoices").update(patch).eq("number", number);
  return new Response("ok", { status: 200 });
}
