import { getSessionUser, type SessionUser } from "@/lib/supabase/user";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

// Spáruje přihlášeného uživatele s jeho kartou klienta (tabulka clients).
// Párování: nejdřív podle clients.user_id, pak jako záloha podle e-mailu.
// Slouží osobní videoknihovně – ať server ví, čí videa smí uživatel vidět.

export type ClientLink = { id: string; name: string | null; email: string | null };

export type ResolvedClient = {
  user: SessionUser | null;
  client: ClientLink | null;
};

export async function resolveClientForUser(): Promise<ResolvedClient> {
  const user = await getSessionUser();
  if (!user || !adminConfigured()) return { user, client: null };

  const db = createAdminClient();

  // 1) přesné spárování přes user_id (QR pozvánka ho nastaví)
  const byId = await db
    .from("clients")
    .select("id,name,email")
    .eq("user_id", user.id)
    .maybeSingle();
  if (byId.data) return { user, client: byId.data as ClientLink };

  // 2) záloha: shoda e-mailu (case-insensitive)
  if (user.email) {
    const byEmail = await db
      .from("clients")
      .select("id,name,email")
      .ilike("email", user.email)
      .maybeSingle();
    if (byEmail.data) return { user, client: byEmail.data as ClientLink };
  }

  return { user, client: null };
}
