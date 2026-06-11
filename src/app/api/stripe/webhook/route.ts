import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, TIER_LABEL } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return new NextResponse("not configured", { status: 503 });

  const stripe = getStripe();
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return new NextResponse("bad signature", { status: 400 });
  }

  const admin = createAdminClient();

  async function applySubscription(sub: Stripe.Subscription) {
    const uid = sub.metadata?.user_id;
    const tier = sub.metadata?.tier;
    if (!uid || !tier) return;
    const active = sub.status === "active" || sub.status === "trialing";
    const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
    await admin.from("profiles").update({
      tier: active ? tier : "free",
      tier_since: new Date().toISOString(),
      tier_until: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      stripe_subscription_id: sub.id,
      subscription_status: sub.status,
    }).eq("id", uid);
  }

  function subIdFrom(x: unknown): string | null {
    if (typeof x === "string") return x;
    if (x && typeof x === "object" && "id" in x) return String((x as { id: string }).id);
    return null;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const subId = subIdFrom(s.subscription);
      if (subId) await applySubscription(await stripe.subscriptions.retrieve(subId));
      break;
    }
    case "invoice.paid": {
      const inv = event.data.object as Stripe.Invoice;
      const subId = subIdFrom((inv as unknown as { subscription?: unknown }).subscription);
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        await applySubscription(sub);
        const tier = sub.metadata?.tier;
        const kc = Math.round((inv.amount_paid ?? 0) / 100);
        if (tier && kc > 0) {
          await admin.from("finance_entries").insert({
            kind: "income",
            category: TIER_LABEL[tier] ?? tier.toUpperCase(),
            amount_kc: kc,
            note: "Předplatné (Stripe)",
          });
        }
      }
      break;
    }
    case "customer.subscription.updated": {
      await applySubscription(event.data.object as Stripe.Subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const uid = sub.metadata?.user_id;
      if (uid) {
        await admin.from("profiles").update({
          tier: "free", tier_until: null, subscription_status: "canceled", stripe_subscription_id: null,
        }).eq("id", uid);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
