// Volitelná e-mailová upozornění. Provozní e-maily (potvrzení rezervace,
// registrace, obnova hesla) chodí vždy a tady nejsou.
export type EmailPref = { key: string; label: string; desc: string; def: boolean };

export const EMAIL_PREFS: EmailPref[] = [
  { key: "membership_end", label: "Konec členství", desc: "Pošlu ti upozornění 3 dny před vypršením členství, ať o přístup nepřijdeš.", def: true },
  { key: "booking_reminder", label: "Připomínka rezervace", desc: "Den před lekcí ti připomenu termín.", def: true },
  { key: "new_content", label: "Nový obsah", desc: "Když přibydou nová videa nebo kurzy (souhrnně, ne na každé video).", def: true },
  { key: "challenge", label: "Měsíční výzva", desc: "Když začne nová měsíční výzva.", def: true },
  { key: "live", label: "Živé přenosy", desc: "Když se chystá nebo začíná LIVE přenos.", def: true },
  { key: "community", label: "Komunita", desc: "Odpověď na tvůj příspěvek nebo nová zpráva od buddyho.", def: true },
  { key: "blog", label: "Nový článek", desc: "Když vyjde nový článek na blogu.", def: false },
  { key: "newsletter", label: "Novinky a akce", desc: "Občasný souhrn novinek a nabídek (pár e-mailů ročně).", def: true },
  { key: "nudge", label: "Motivační pošťouchnutí", desc: "Když se dlouho neukážeš, jemně tě hecnu zpět. (Defaultně vypnuto.)", def: false },
];

export function prefEnabled(prefs: Record<string, boolean> | null | undefined, key: string): boolean {
  const def = EMAIL_PREFS.find((p) => p.key === key)?.def ?? false;
  if (!prefs || !(key in prefs)) return def;
  return !!prefs[key];
}
