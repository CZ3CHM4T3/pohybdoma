import type { UserTier } from "@/types";
import { DEMO_COOKIE, parseDemoTier } from "@/lib/demo";

// Klientské čtení/zápis demo úrovně (cookie není httpOnly, ať ji vidí i prohlížeč).

export function getDemoTierClient(): UserTier | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${DEMO_COOKIE}=([^;]*)`));
  return parseDemoTier(m ? decodeURIComponent(m[1]) : null);
}

export function setDemoTierClient(tier: UserTier | null) {
  if (typeof document === "undefined") return;
  const base = "path=/; samesite=lax";
  if (tier) {
    document.cookie = `${DEMO_COOKIE}=${tier}; ${base}; max-age=${60 * 60 * 24 * 180}`;
  } else {
    document.cookie = `${DEMO_COOKIE}=; ${base}; max-age=0`;
  }
}
