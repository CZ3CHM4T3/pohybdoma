import type { UserTier } from "@/types";

// Demo (ukázkový) režim: nepřihlášený návštěvník si může zvolit, jako jaká
// úroveň členství si web prohlédne. Volba se ukládá do cookie níže.
// POZOR: demo NIKDY nedává práva admina – admin se váže výhradně na e-mail.
export const DEMO_COOKIE = "pd_demo_tier";

export const DEMO_TIERS: UserTier[] = ["FREE", "MEMBER", "VIP", "VIP_PLUS"];

export const DEMO_TIER_LABEL: Record<UserTier, string> = {
  FREE: "FREE",
  MEMBER: "MEMBER",
  VIP: "VIP",
  VIP_PLUS: "VIP+",
};

/** Z hodnoty cookie udělá platnou úroveň, nebo null. */
export function parseDemoTier(v: string | null | undefined): UserTier | null {
  if (!v) return null;
  const up = v.toUpperCase();
  return (DEMO_TIERS as string[]).includes(up) ? (up as UserTier) : null;
}
