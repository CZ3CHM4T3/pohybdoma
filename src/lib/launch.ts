// ── Spuštění do světa (soft launch) ──────────────────────────────────────────
// Zatím je veřejně hotové jen: Domů, Rezervace (kalendář), Recenze, O mně, Kontakt.
// Zbytek se ukáže jako „připravuje se" (v navigaci je vidět, ale bez detailů).
// Admin vidí vše normálně; přes „Zobrazit jako" si může projít i pohled návštěvníka.
// Až bude web celý hotový, přepni LAUNCH_MODE na false.

export const LAUNCH_MODE = true;

// Veřejně hotové marketing/obsah stránky (Domů „/" je veřejná vždy).
export const READY_PATHS = ["/rezervace", "/recenze", "/o-mne", "/kontakt"];

// Systémové / vždy funkční stránky (nikdy „připravuje se").
const ALWAYS_PATHS = [
  "/ucet", "/obnova-hesla", "/auth", "/vstup",
  "/gdpr", "/obchodni-podminky", "/zdravotni-upozorneni",
  "/admin", "/api", "/brzy",
];

function hit(list: string[], p: string): boolean {
  return list.some((x) => p === x || p.startsWith(x + "/"));
}

/** Je daná cesta v režimu „připravuje se" (pro veřejnost skrytá)? */
export function isComingSoon(pathname: string): boolean {
  if (!LAUNCH_MODE) return false;
  if (pathname === "/") return false;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return false;
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico" || /\.[a-zA-Z0-9]+$/.test(pathname)) return false;
  if (hit(READY_PATHS, pathname) || hit(ALWAYS_PATHS, pathname)) return false;
  return true;
}

/** Je odkaz v navigaci veřejně hotový? (jinak se u něj ukáže štítek „brzy") */
export function isNavReady(href: string): boolean {
  if (!LAUNCH_MODE) return true;
  if (href === "/") return true;
  return hit(READY_PATHS, href) || hit(ALWAYS_PATHS, href);
}

const LABELS: [string, string][] = [
  ["/videoknihovna", "Knihovna pohybu"],
  ["/kurzy", "Videokurzy"],
  ["/clenstvi", "Členství"],
  ["/blog", "Blog"],
  ["/vip", "VIP"],
  ["/odznaky", "Odznaky"],
  ["/osobni-lekce", "Osobní lekce"],
  ["/produkty", "Produkty"],
  ["/kruhy", "Kruhy"],
  ["/denik", "Deník"],
  ["/klub", "Klub"],
  ["/chlubirna", "Chlubírna"],
  ["/buddies", "Parťáci"],
  ["/videoknihovna", "Knihovna pohybu"],
];

/** Přátelský název sekce pro stránku „připravuje se". */
export function sectionLabel(pathname: string): string {
  const f = LABELS.find(([p]) => pathname === p || pathname.startsWith(p + "/"));
  return f ? f[1] : "Tato část";
}
