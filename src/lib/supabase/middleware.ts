import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SITE_GATE_CODE } from "@/lib/gate";
import { isPublicPath } from "@/lib/public-paths";

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

  // Obnoví token, pokud vypršel. Když je Supabase nedostupný (nebo pomalý),
  // nesmí to blokovat web – proto časový strop 1,5 s (pak prostě pokračujeme).
  let user: { id: string } | null = null;
  try {
    const userPromise = supabase.auth.getUser();
    userPromise.catch(() => {});
    const res = await Promise.race([
      userPromise,
      new Promise<{ data: { user: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { user: null } }), 1500)
      ),
    ]);
    user = (res as { data: { user: { id: string } | null } }).data.user;
  } catch {
    // ignorujeme – session se obnoví při dalším požadavku
  }

  // Soukromá brána (soft-launch): nepřihlášený návštěvník BEZ kódu → uvítací /vstup.
  // Přihlášený uživatel i držitel kódu projdou vždy. Data chrání RLS – tady jen skrýváme
  // rozpracovaný obsah. Když je auth pomalá/nejistá, raději pustíme (fail-open), ať to
  // nikoho nevyhazuje.
  if (SITE_GATE_CODE) {
    const { pathname } = request.nextUrl;
    const publicOK =
      isPublicPath(pathname) ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      /\.[a-zA-Z0-9]+$/.test(pathname);
    if (!publicOK) {
      const hasCode = request.cookies.get("pd_access")?.value === SITE_GATE_CODE;
      const hasAuthCookie = request.cookies
        .getAll()
        .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
      if (!user && !hasCode && !hasAuthCookie) {
        const u = request.nextUrl.clone();
        u.pathname = "/vstup";
        u.search = "";
        return NextResponse.rewrite(u);
      }
    }
  }

  return supabaseResponse;
}
