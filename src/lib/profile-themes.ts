// Vzhledy profilové karty – člen si vybere, jak jeho "zeď" vypadá.
export type ProfileTheme = {
  key: string;
  label: string;
  card: string;   // pozadí karty
  swatch: string; // náhled ve výběru
};

export const PROFILE_THEMES: ProfileTheme[] = [
  { key: "default", label: "Čistá", card: "bg-white", swatch: "bg-white ring-1 ring-gray-200" },
  { key: "blue", label: "Modrá obloha", card: "bg-gradient-to-br from-sky-50 to-indigo-50", swatch: "bg-gradient-to-br from-sky-200 to-indigo-300" },
  { key: "sunset", label: "Západ slunce", card: "bg-gradient-to-br from-orange-50 to-rose-50", swatch: "bg-gradient-to-br from-orange-200 to-rose-300" },
  { key: "mint", label: "Máta", card: "bg-gradient-to-br from-emerald-50 to-teal-50", swatch: "bg-gradient-to-br from-emerald-200 to-teal-300" },
  { key: "violet", label: "Fialová", card: "bg-gradient-to-br from-violet-50 to-fuchsia-50", swatch: "bg-gradient-to-br from-violet-200 to-fuchsia-300" },
  { key: "gold", label: "Zlatá", card: "bg-gradient-to-br from-amber-50 to-yellow-50", swatch: "bg-gradient-to-br from-amber-200 to-yellow-300" },
  { key: "rose", label: "Růžová", card: "bg-gradient-to-br from-rose-50 to-pink-50", swatch: "bg-gradient-to-br from-rose-200 to-pink-300" },
  { key: "night", label: "Břidlice", card: "bg-gradient-to-br from-slate-100 to-slate-200", swatch: "bg-gradient-to-br from-slate-300 to-slate-400" },
  { key: "lime", label: "Limetka", card: "bg-gradient-to-br from-lime-50 to-green-50", swatch: "bg-gradient-to-br from-lime-200 to-green-300" },
];

export function themeCard(key: string | null | undefined): string {
  return (PROFILE_THEMES.find((t) => t.key === key) ?? PROFILE_THEMES[0]).card;
}
