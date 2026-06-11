import { NextResponse } from "next/server";
import { getStripe, stripeConfigured, PRICE_BY_TIER, normalizeTierKey } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!stripeConfigured() || !adminConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let tier: string | null = null;
  try {
    const body = await req.json();
    tier = normalizeTierKey(body?.tier);
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!tier) return NextResponse.json({ error: "bad_tier" }, { status: 400 });
  const price = PRICE_BY_TIER[tier];
  if (!price) return NextResponse.json({ error: "no_price" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_logged" }, { status: 401 });

  const stripe = getStripe();
  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  let customer = (prof?.stripe_customer_id as string | null) ?? null;
  if (!customer) {
    const c = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
    customer = c.id;
    await admin.from("profiles").update({ stripe_customer_id: customer }).eq("id", user.id);
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://pohybdoma.cz";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price, quantity: 1 }],
    success_url: `${site}/ucet?platba=ok`,
    cancel_url: `${site}/clenstvi?platba=zruseno`,
    allow_promotion_codes: true,
    metadata: { user_id: user.id, tier },
    subscription_data: { metadata: { user_id: user.id, tier } },
  });

  return NextResponse.json({ url: session.url });
}
