import {
  Flame, Activity, Trophy, Rocket, BookOpen, Heart, Star, Users, PartyPopper,
  Award, Crown, CalendarCheck, GraduationCap, Sparkles, Medal, Gem, type LucideIcon,
} from "lucide-react";

export type BadgeTier = "bronze" | "silver" | "gold";

/** Metriky, které umíme spočítat z dat. */
export type Stats = {
  lessons: number;        // odcvičené lekce/videa (lesson_progress completed)
  diary: number;          // zápisy v deníku
  favorites: number;      // oblíbená videa
  buddies: number;        // přijatí buddies
  brags: number;          // příspěvky v Chlubírně
  challenges: number;     // splněné výzvy
  circlesCreated: number; // založené kruhy
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
  { id: "lessons-100", name: "Stovkař", sub: "100 odcvičených videí", Icon: Trophy, tier: "gold", cat: "Pohyb", metric: "lessons", threshold: 100 },
  // Kurzy (počítáme přes lekce – zatím proxy; přesné kurzy doplníme)
  { id: "course-1", name: "Student", sub: "1. dokončený kurz", Icon: GraduationCap, tier: "bronze", cat: "Pohyb", manual: true },
  { id: "course-5", name: "Sběratel diplomů", sub: "5 dokončených kurzů", Icon: GraduationCap, tier: "gold", cat: "Pohyb", manual: true },
  // Knihovna %
  { id: "lib-10", name: "Průzkumník", sub: "10 % knihovny", Icon: Sparkles, tier: "bronze", cat: "Pohyb", manual: true },
  { id: "lib-100", name: "Kompletista", sub: "celá knihovna", Icon: Gem, tier: "gold", cat: "Pohyb", manual: true },

  // Deník
  { id: "diary-7", name: "Zapisovatel", sub: "7 zápisů v deníku", Icon: BookOpen, tier: "bronze", cat: "Návyk", metric: "diary", threshold: 7 },
  { id: "diary-30", name: "Kronikář", sub: "30 zápisů", Icon: BookOpen, tier: "silver", cat: "Návyk", metric: "diary", threshold: 30 },
  { id: "diary-100", name: "Letopisec", sub: "100 zápisů", Icon: BookOpen, tier: "gold", cat: "Návyk", metric: "diary", threshold: 100 },
  // Série dní (zatím bez trackingu)
  { id: "streak-7", name: "Týden v kuse", sub: "7 dní v řadě", Icon: Flame, tier: "bronze", cat: "Návyk", manual: true },
  { id: "streak-30", name: "Disciplína", sub: "30 dní v řadě", Icon: Flame, tier: "silver", cat: "Návyk", manual: true },
  { id: "streak-100", name: "Železná vůle", sub: "100 dní v řadě", Icon: Flame, tier: "gold", cat: "Návyk", manual: true },
  // Výzvy
  { id: "ch-1", name: "Výzva přijata", sub: "1. splněná výzva", Icon: Star, tier: "bronze", cat: "Návyk", metric: "challenges", threshold: 1 },
  { id: "ch-3", name: "Bojovník", sub: "3 splněné výzvy", Icon: Star, tier: "silver", cat: "Návyk", metric: "challenges", threshold: 3 },
  { id: "ch-12", name: "Nezastavitelný", sub: "12 splněných výzev", Icon: Award, tier: "gold", cat: "Návyk", metric: "challenges", threshold: 12 },

  // Komunita
  { id: "brag-1", name: "Premiéra", sub: "1. příspěvek v Chlubírně", Icon: PartyPopper, tier: "bronze", cat: "Komunita", metric: "brags", threshold: 1 },
  { id: "brag-10", name: "Chvástal", sub: "10 příspěvků v Chlubírně", Icon: PartyPopper, tier: "silver", cat: "Komunita", metric: "brags", threshold: 10 },
  { id: "buddy-1", name: "Parťák", sub: "1. buddy", Icon: Users, tier: "bronze", cat: "Komunita", metric: "buddies", threshold: 1 },
  { id: "buddy-5", name: "Síťař", sub: "5 buddies", Icon: Users, tier: "silver", cat: "Komunita", metric: "buddies", threshold: 5 },
  { id: "fav-1", name: "Sběratel oblíbených", sub: "1. uložené video", Icon: Heart, tier: "bronze", cat: "Komunita", metric: "favorites", threshold: 1 },
  { id: "fav-10", name: "Kurátor", sub: "10 oblíbených videí", Icon: Heart, tier: "silver", cat: "Komunita", metric: "favorites", threshold: 10 },
  { id: "circle-1", name: "Zakladatel", sub: "založíš vlastní kruh", Icon: Users, tier: "gold", cat: "Komunita", metric: "circlesCreated", threshold: 1 },
  { id: "nebojsa", name: "Nebojsa", sub: "1. rezervace osobního tréninku", Icon: CalendarCheck, tier: "silver", cat: "Komunita", manual: true },

  // Věrnost
  { id: "loy-90", name: "Stálý host", sub: "3 měsíce členství", Icon: Medal, tier: "bronze", cat: "Věrnost", metric: "membershipDays", threshold: 90 },
  { id: "loy-365", name: "Rok v pohybu", sub: "1 rok členství", Icon: Medal, tier: "silver", cat: "Věrnost", metric: "membershipDays", threshold: 365 },
  { id: "loy-730", name: "Stálice", sub: "2 roky členství", Icon: Crown, tier: "gold", cat: "Věrnost", metric: "membershipDays", threshold: 730 },
];

export const BADGE_MAP: Record<string, BadgeDef> = Object.fromEntries(BADGES.map((b) => [b.id, b]));

export const TIER_RING: Record<BadgeTier, string> = {
  bronze: "from-amber-600 to-amber-800",
  silver: "from-slate-300 to-slate-500",
  gold: "from-yellow-300 to-amber-500",
};
export const TIER_ICON: Record<BadgeTier, string> = {
  bronze: "text-amber-700",
  silver: "text-slate-500",
  gold: "text-amber-500",
};

export function isEarned(b: BadgeDef, s: Stats): boolean {
  if (b.manual || !b.metric || b.threshold == null) return false;
  return s[b.metric] >= b.threshold;
}
