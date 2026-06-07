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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, tier")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName:
      (profile?.full_name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      null,
    tier: normalizeTier(profile?.tier as string | undefined),
    isAdmin: isAdminEmail(user.email),
  };
}

/** Jen úroveň přihlášeného uživatele; nepřihlášený = "FREE". */
export async function getUserTier(): Promise<UserTier> {
  const u = await getSessionUser();
  return u?.tier ?? "FREE";
}
