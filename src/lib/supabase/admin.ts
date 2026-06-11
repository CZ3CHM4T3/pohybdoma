import { createClient } from "@supabase/supabase-js";

// Service-role klient (obchází RLS) – jen pro server (webhooky, cron-like akce).
// Klíč SUPABASE_SERVICE_ROLE_KEY se nikdy neposílá do prohlížeče.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export function adminConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
