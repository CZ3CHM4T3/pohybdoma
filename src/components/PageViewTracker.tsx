"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Lehké sledování návštěv bez cookies: jen cesta + čas (+ uživatel, pokud je přihlášený).
// Admin stránky se nepočítají.
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      supabase.from("page_views").insert({ path: pathname, uid: data.user?.id ?? null });
    });
  }, [pathname]);
  return null;
}
