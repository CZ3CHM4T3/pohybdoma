import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { SITE_GATE_CODE } from "@/lib/gate";

// ── Soukromá brána ───────────────────────────────────────────────────────────
// Aktivní jen když je nastavená proměnná SITE_ACCESS_CODE (jinak je web veřejný).
// Odemčení: odkaz  https://pohybdoma.cz/?pristup=TVUJ_KOD  (uloží cookie),
// nebo zadáním kódu na stránce /vstup. Vypnutí brány = smazat SITE_ACCESS_CODE.
// Samotné rozhodnutí "pustit / na /vstup" dělá updateSession (zná i přihlášení).
const COOKIE = "pd_access";

// Odemčení odkazem ?pristup=KOD → jen uloží cookie a přesměruje bez parametru.
function applyAccessCode(req: NextRequest): NextResponse | null {
  const code = SITE_GATE_CODE;
  if (!code) return null;
  if (req.nextUrl.searchParams.get("pristup") === code) {
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
  return null;
}

export async function middleware(request: NextRequest) {
  const set = applyAccessCode(request);
  if (set) return set;
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
