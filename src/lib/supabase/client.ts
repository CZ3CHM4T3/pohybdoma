import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase klient pro prohlížeč (klientské komponenty).
 * Používá veřejné proměnné NEXT_PUBLIC_* (anon klíč je bezpečný pro prohlížeč).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
