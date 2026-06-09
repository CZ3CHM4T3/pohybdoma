import {
  Flame, Activity, Trophy, Rocket, BookOpen, Heart, Star, Users, PartyPopper,
  Award, Crown, CalendarCheck, GraduationCap, Sparkles, Medal, Gem, type LucideIcon,
} from "lucide-react";

export type BadgeTier = "bronze" | "silver" | "gold" | "legend";

/** Metriky, které umíme spočítat z dat. */
export type Stats = {
  lessons: number;        // odcvičené lekce/videa (lesson_progress completed)
  diary: number;          // zápisy v deníku
  favorites: number;      // oblíbená videa
  buddies: number;        // přijatí buddies
  brags: number;          // příspěvky v Chlubírně
  challenges: number;     // splněné výzvy
  circlesCreated: number; // založené kruhy
  circlesJoined: number;  // členství v kruzích
  membershipDays: number; // dní členství (od tier_since)
};

export type BadgeDef = {
  id: string;
  name: string;
  sub: string;
  Icon: LucideIcon;
  tier: BadgeTier;
  cat: string;
  metric?: keyof Stats; // pokud je, odznak se uděluje automaticky podle prahu
  threshold?: number;
  manual?: boolean;     // zatím neměřitelné (připravujeme tracking) → zamčené
};

export const BADGES: BadgeDef[] = [
  // Odcvičená videa
  { id: "lessons-1", name: "Start", sub: "1. odcvičené video", Icon: Rocket, tier: "bronze", cat: "Pohyb", metric: "lessons", threshold: 1 },
  { id: "lessons-10", name: "Rozběh", sub: "10 odcvičených videí", Icon: Activity, tier: "bronze", cat: "Pohyb", metric: "lessons", threshold: 10 },
  { id: "lessons-50", name: "Vytrvalec", sub: "50 odcvičených videí", Icon: Activity, tier: "silver", cat: "Pohyb", metric: "lessons", threshold: 50 },
  { id: "lessons-100", name: "Stovkař", sub: "100 odcvičených videí", Icon: Trophy, tier: "legend", cat: "Pohyb", metric: "lessons", threshold: 100 },
  // Kurzy (počítáme přes lekce – zatím proxy; přesné kurzy doplníme)
  { id: "course-1", name: "Student", sub: "1. dokončený kurz", Icon: GraduationCap, tier: "bronze", cat: "Pohyb", manual: true },
  { id: "course-5", name: "Sběratel diplomů", sub: "5 dokončených kurzů", Icon: GraduationCap, tier: "legend", cat: "Pohyb", manual: true },
  // Knihovna %
  { id: "lib-10", name: "Průzkumník", sub: "10 % knihovny", Icon: Sparkles, tier: "bronze", cat: "Pohyb", manual: true },
  { id: "lib-100", name: "Kompletista", sub: "celá knihovna", Icon: Gem, tier: "legend", cat: "Pohyb", manual: true },

  // Deník
  { id: "diary-7", name: "Zapisovatel", sub: "7 zápisů v deníku", Icon: BookOpen, tier: "bronze", cat: "Návyk", metric: "diary", threshold: 7 },
  { id: "diary-30", name: "Kronikář", sub: "30 zápisů", Icon: BookOpen, tier: "silver", cat: "Návyk", metric: "diary", threshold: 30 },
  { id: "diary-100", name: "Letopisec", sub: "100 zápisů", Icon: BookOpen, tier: "legend", cat: "Návyk", metric: "diary", threshold: 100 },
  // Série dní (zatím bez trackingu)
  { id: "streak-7", name: "Týden v kuse", sub: "7 dní v řadě", Icon: Flame, tier: "bronze", cat: "Návyk", manual: true },
  { id: "streak-30", name: "Disciplína", sub: "30 dní v řadě", Icon: Flame, tier: "silver", cat: "Návyk", manual: true },
  { id: "streak-100", name: "Železná vůle", sub: "100 dní v řadě", Icon: Flame, tier: "legend", cat: "Návyk", manual: true },
  // Výzvy
  { id: "ch-1", name: "Výzva přijata", sub: "1. splněná výzva", Icon: Star, tier: "bronze", cat: "Návyk", metric: "challenges", threshold: 1 },
  { id: "ch-3", name: "Bojovník", sub: "3 splněné výzvy", Icon: Star, tier: "silver", cat: "Návyk", metric: "challenges", threshold: 3 },
  { id: "ch-12", name: "Nezastavitelný", sub: "12 splněných výzev", Icon: Award, tier: "legend", cat: "Návyk", metric: "challenges", threshold: 12 },

  // Komunita
  { id: "brag-1", name: "Premiéra", sub: "1. příspěvek v Chlubírně", Icon: PartyPopper, tier: "bronze", cat: "Komunita", metric: "brags", threshold: 1 },
  { id: "brag-10", name: "Chvástal", sub: "10 příspěvků v Chlubírně", Icon: PartyPopper, tier: "silver", cat: "Komunita", metric: "brags", threshold: 10 },
  { id: "buddy-1", name: "Parťák", sub: "1. buddy", Icon: Users, tier: "bronze", cat: "Komunita", metric: "buddies", threshold: 1 },
  { id: "buddy-5", name: "Síťař", sub: "5 buddies", Icon: Users, tier: "silver", cat: "Komunita", metric: "buddies", threshold: 5 },
  { id: "fav-1", name: "Sběratel oblíbených", sub: "1. uložené video", Icon: Heart, tier: "bronze", cat: "Komunita", metric: "favorites", threshold: 1 },
  { id: "fav-10", name: "Kurátor", sub: "10 oblíbených videí", Icon: Heart, tier: "silver", cat: "Komunita", metric: "favorites", threshold: 10 },
  { id: "circle-join-1", name: "Člen kruhu", sub: "připojíš se do kruhu", Icon: Users, tier: "bronze", cat: "Komunita", metric: "circlesJoined", threshold: 1 },
  { id: "circle-join-3", name: "Společenství", sub: "3 kruhy", Icon: Users, tier: "silver", cat: "Komunita", metric: "circlesJoined", threshold: 3 },
  { id: "circle-1", name: "Zakladatel", sub: "založíš vlastní kruh", Icon: Users, tier: "gold", cat: "Komunita", metric: "circlesCreated", threshold: 1 },
  { id: "nebojsa", name: "Nebojsa", sub: "1. rezervace osobního tréninku", Icon: CalendarCheck, tier: "silver", cat: "Komunita", manual: true },

  // Věrnost
  { id: "loy-90", name: "Stálý host", sub: "3 měsíce členství", Icon: Medal, tier: "bronze", cat: "Věrnost", metric: "membershipDays", threshold: 90 },
  { id: "loy-365", name: "Rok v pohybu", sub: "1 rok členství", Icon: Medal, tier: "silver", cat: "Věrnost", metric: "membershipDays", threshold: 365 },
  { id: "loy-730", name: "Stálice", sub: "2 roky členství", Icon: Crown, tier: "legend", cat: "Věrnost", metric: "membershipDays", threshold: 730 },
];

export const BADGE_MAP: Record<string, BadgeDef> = Object.fromEntries(BADGES.map((b) => [b.id, b]));

// Gradace prestiže: bronz → stříbro → zlato → legenda (čím těžší, tím epičtější)
export const TIER_RING: Record<BadgeTier, string> = {
  bronze: "from-amber-600 to-amber-800",
  silver: "from-slate-300 to-slate-500",
  gold: "from-yellow-300 to-amber-500",
  legend: "from-fuchsia-500 via-violet-500 to-indigo-600",
};
export const TIER_ICON: Record<BadgeTier, string> = {
  bronze: "text-amber-700",
  silver: "text-slate-500",
  gold: "text-amber-600",
  legend: "text-violet-600",
};
export const TIER_GLOW: Record<BadgeTier, string> = {
  bronze: "",
  silver: "",
  gold: "shadow-[0_0_14px_rgba(245,158,11,0.55)]",
  legend: "shadow-[0_0_20px_rgba(139,92,246,0.65)] ring-2 ring-violet-300",
};
export const TIER_LABEL: Record<BadgeTier, string> = {
  bronze: "bronz",
  silver: "stříbro",
  gold: "zlato",
  legend: "legenda",
};

export function isEarned(b: BadgeDef, s: Stats): boolean {
  if (b.manual || !b.metric || b.threshold == null) return false;
  return s[b.metric] >= b.threshold;
}

// ── Cesty (série) – jeden medailon, který se upgraduje (bronz→stříbro→…) ──────
export type Track = { id: string; label: string; cat: string; Icon: LucideIcon; steps: string[] };

export const TRACKS: Track[] = [
  { id: "t-lessons", label: "Odcvičená videa", cat: "Pohyb", Icon: Activity, steps: ["lessons-1", "lessons-10", "lessons-50", "lessons-100"] },
  { id: "t-course", label: "Kurzy", cat: "Pohyb", Icon: GraduationCap, steps: ["course-1", "course-5"] },
  { id: "t-lib", label: "Knihovna", cat: "Pohyb", Icon: Sparkles, steps: ["lib-10", "lib-100"] },
  { id: "t-diary", label: "Deník", cat: "Návyk", Icon: BookOpen, steps: ["diary-7", "diary-30", "diary-100"] },
  { id: "t-streak", label: "Série dní", cat: "Návyk", Icon: Flame, steps: ["streak-7", "streak-30", "streak-100"] },
  { id: "t-ch", label: "Výzvy", cat: "Návyk", Icon: Star, steps: ["ch-1", "ch-3", "ch-12"] },
  { id: "t-brag", label: "Chlubírna", cat: "Komunita", Icon: PartyPopper, steps: ["brag-1", "brag-10"] },
  { id: "t-buddy", label: "Buddies", cat: "Komunita", Icon: Users, steps: ["buddy-1", "buddy-5"] },
  { id: "t-fav", label: "Oblíbená videa", cat: "Komunita", Icon: Heart, steps: ["fav-1", "fav-10"] },
  { id: "t-cjoin", label: "Členství v kruzích", cat: "Komunita", Icon: Users, steps: ["circle-join-1", "circle-join-3"] },
  { id: "t-ccreate", label: "Zakladatel kruhu", cat: "Komunita", Icon: Users, steps: ["circle-1"] },
  { id: "t-nebojsa", label: "Osobní trénink", cat: "Komunita", Icon: CalendarCheck, steps: ["nebojsa"] },
  { id: "t-loy", label: "Věrnost", cat: "Věrnost", Icon: Medal, steps: ["loy-90", "loy-365", "loy-730"] },
];

export type TrackState = { level: number; current: BadgeDef | null; next: BadgeDef | null; now: number; max: number; maxed: boolean };

export function trackState(t: Track, s: Stats): TrackState {
  let level = 0;
  let current: BadgeDef | null = null;
  for (let i = 0; i < t.steps.length; i++) {
    const b = BADGE_MAP[t.steps[i]];
    if (b && isEarned(b, s)) { level = i + 1; current = b; }
  }
  const next = level < t.steps.length ? BADGE_MAP[t.steps[level]] : null;
  let now = 0, max = 0;
  if (next && next.metric && next.threshold != null) { now = s[next.metric]; max = next.threshold; }
  return { level, current, next, now, max, maxed: next == null };
}
