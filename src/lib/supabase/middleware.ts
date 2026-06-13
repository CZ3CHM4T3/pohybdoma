import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SITE_GATE_CODE } from "@/lib/gate";
import { PREVIEW_MODE } from "@/lib/preview";

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

  // Přihlašovací zeď: jen v „soukromém režimu" (když je nastaven SITE_ACCESS_CODE).
  // Nepřihlášeného pošleme na /ucet (registrace/přihlášení), kromě veřejných stránek.
  // V PREVIEW (ukázkovém) režimu je zeď VYPNUTÁ – návštěvník po zadání kódu si web
  // prohlíží volně jako zvolená demo úroveň, bez nutnosti registrace.
  if (SITE_GATE_CODE && !user && !PREVIEW_MODE) {
    const { pathname } = request.nextUrl;
    const isPublic =
      pathname === "/ucet" ||
      pathname === "/vstup" ||
      pathname === "/obnova-hesla" ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname === "/gdpr" ||
      pathname === "/obchodni-podminky" ||
      pathname === "/zdravotni-upozorneni" ||
      /\.[a-zA-Z0-9]+$/.test(pathname);
    if (!isPublic) {
      const u = request.nextUrl.clone();
      u.pathname = "/ucet";
      u.search = "";
      return NextResponse.redirect(u);
    }
  }

  return supabaseResponse;
}
