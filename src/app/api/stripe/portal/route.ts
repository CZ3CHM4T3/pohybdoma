import { NextResponse } from "next/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  if (!stripeConfigured() || !adminConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_logged" }, { status: 401 });

  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  const customer = (prof?.stripe_customer_id as string | null) ?? null;
  if (!customer) return NextResponse.json({ error: "no_customer" }, { status: 400 });

  const stripe = getStripe();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://pohybdoma.cz";
  const session = await stripe.billingPortal.sessions.create({
    customer,
    return_url: `${site}/ucet`,
  });
  return NextResponse.json({ url: session.url });
}
