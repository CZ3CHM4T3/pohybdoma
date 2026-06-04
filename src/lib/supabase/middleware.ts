import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Obnovuje (refreshuje) Supabase session při každém požadavku a propisuje
 * cookies. Volá se z src/middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Pokud nejsou klíče (např. lokálně bez .env), session neřešíme.
  if (!url || !key) return supabaseResponse;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Důležité: obnoví token, pokud vypršel.
  // Když je Supabase dočasně nedostupný, nesmí to shodit celý web.
  try {
    await supabase.auth.getUser();
  } catch {
    // ignorujeme – session se obnoví při dalším požadavku
  }

  return supabaseResponse;
}
