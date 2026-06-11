import Stripe from "stripe";

// Líná inicializace – Stripe se vytvoří až při prvním použití (a jen když je klíč).
// Díky tomu build/projít nespadne, když klíč ještě není nastavený.
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
  return _stripe;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// Úroveň členství (DB) → Stripe Price ID (z env – vytvoříš v Stripe dashboardu).
export const PRICE_BY_TIER: Record<string, string | undefined> = {
  member: process.env.STRIPE_PRICE_MEMBER,
  vip: process.env.STRIPE_PRICE_VIP,
  vip_plus: process.env.STRIPE_PRICE_VIP_PLUS,
};

// Opačně: z Price ID zjisti úroveň.
export function tierFromPrice(priceId: string | null | undefined): string | null {
  if (!priceId) return null;
  for (const [tier, pid] of Object.entries(PRICE_BY_TIER)) if (pid && pid === priceId) return tier;
  return null;
}

// Normalizace různých zápisů úrovně na DB tvar.
export function normalizeTierKey(t: string | null | undefined): string | null {
  const v = (t || "").toLowerCase().replace(/[\s-]/g, "_").replace("vipplus", "vip_plus").replace("vip+", "vip_plus");
  return ["member", "vip", "vip_plus"].includes(v) ? v : null;
}

export const TIER_LABEL: Record<string, string> = { member: "MEMBER", vip: "VIP", vip_plus: "VIP+" };
