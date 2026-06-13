import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { normalizeTier } from "@/lib/tiers";
import type { UserTier } from "@/types";

export type SessionUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  tier: UserTier;
  isAdmin: boolean;
};

/**
 * Vrátí přihlášeného uživatele včetně jeho úrovně členství (z tabulky profiles).
 * Když nikdo není přihlášený, vrací null.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Zkus načíst i datum konce členství; když sloupec ještě není, spadni na základ.
  const full = await supabase
    .from("profiles")
    .select("full_name, tier, tier_until")
    .eq("id", user.id)
    .maybeSingle();
  let raw: Record<string, unknown> | null = (full.data as Record<string, unknown> | null) ?? null;
  if (full.error) {
    const base = await supabase.from("profiles").select("full_name, tier").eq("id", user.id).maybeSingle();
    raw = (base.data as Record<string, unknown> | null) ?? null;
  }

  const fullName = (raw?.full_name as string | undefined) ?? null;
  let tier = normalizeTier(raw?.tier as string | undefined);
  // Auto-vypršení: po konci platnosti je z člena zase FREE.
  const until = (raw?.tier_until as string | null | undefined) ?? null;
  if (tier !== "FREE" && until && new Date(until).getTime() < Date.now()) {
    tier = "FREE";
  }

  return {
    id: user.id,
    email: user.email ?? null,
    fullName:
      fullName ??
      (user.user_metadata?.full_name as string | undefined) ??
      null,
    tier,
    isAdmin: isAdminEmail(user.email),
  };
}

/** Jen úroveň přihlášeného uživatele; nepřihlášený = "FREE". */
export async function getUserTier(): Promise<UserTier> {
  const u = await getSessionUser();
  return u?.tier ?? "FREE";
}
