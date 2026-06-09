import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { SITE_GATE_CODE } from "@/lib/gate";

// ── Soukromá brána ───────────────────────────────────────────────────────────
// Aktivní jen když je nastavená proměnná SITE_ACCESS_CODE (jinak je web veřejný).
// Odemčení: odkaz  https://pohybdoma.cz/?pristup=TVUJ_KOD  (uloží cookie),
// nebo zadáním kódu na stránce /vstup. Vypnutí brány = smazat SITE_ACCESS_CODE.
const COOKIE = "pd_access";

function gate(req: NextRequest): NextResponse | null {
  const code = SITE_GATE_CODE;
  if (!code) return null; // brána vypnutá → web veřejný

  const { pathname, searchParams } = req.nextUrl;

  // Vždy povol: vstupní stránku, API, Next interní a statické soubory
  if (
    pathname === "/vstup" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return null;
  }

  // Odemčení odkazem ?pristup=KOD
  if (searchParams.get("pristup") === code) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("pristup");
    const res = NextResponse.redirect(url);
    res.cookies.set(COOKIE, code, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180, // půl roku
    });
    return res;
  }

  // Už odemčeno cookie → pokračuj dál
  if (req.cookies.get(COOKIE)?.value === code) return null;

  // Jinak na vstupní stránku (URL zůstává)
  const url = req.nextUrl.clone();
  url.pathname = "/vstup";
  url.search = "";
  return NextResponse.rewrite(url);
}

export async function middleware(request: NextRequest) {
  const blocked = gate(request);
  if (blocked) return blocked;
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Spustí se na všech cestách kromě statických souborů a obrázků.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
