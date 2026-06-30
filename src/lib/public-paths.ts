// Stránky přístupné VEŘEJNĚ i v soukromém režimu (soft launch).
// Výloha + Rezervace + Blog jsou otevřené všem. Zbytek (knihovna, kurzy,
// Klub, členství…) zůstává za přístupovým kódem ("připravujeme").
// Úprava: až bude web celý veřejný, smaž SITE_ACCESS_CODE a brána zmizí.
const PUBLIC_PATHS = [
  "/o-mne",
  "/recenze",
  "/kontakt",
  "/rezervace",
  "/osobni-lekce",
  "/blog",
  // přihlášení / účet / brána
  "/ucet",
  "/obnova-hesla",
  "/vstup",
  "/auth",
  // právní stránky
  "/gdpr",
  "/obchodni-podminky",
  "/zdravotni-upozorneni",
];

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
