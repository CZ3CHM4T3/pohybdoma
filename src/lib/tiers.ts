import type { AccessLevel } from "@/types";

/**
 * Jednotné barevné značení úrovní napříč celým webem:
 *   FREE = šedá · MEMBER = modrá · VIP = fialová · VIP+ = zlatá (amber)
 */
export const TIER_STYLES: Record<
  AccessLevel,
  {
    label: string;
    badge: string; // pilulka (pozadí + text)
    card: string; // pastelové pozadí karty
    accentText: string; // barevný text (název, cena, ✓)
    solid: string; // plná barva (tlačítka, výrazné odznaky) + bílý text
    dot: string; // barevná tečka
  }
> = {
  FREE: {
    label: "FREE",
    badge: "bg-gray-100 text-gray-600",
    card: "bg-gray-50",
    accentText: "text-gray-600",
    solid: "bg-gray-500 text-white",
    dot: "bg-gray-400",
  },
  MEMBER: {
    label: "MEMBER",
    badge: "bg-blue-100 text-blue-700",
    card: "bg-blue-50",
    accentText: "text-blue-700",
    solid: "bg-blue-600 text-white",
    dot: "bg-blue-500",
  },
  VIP: {
    label: "VIP",
    badge: "bg-violet-100 text-violet-700",
    card: "bg-violet-50",
    accentText: "text-violet-700",
    solid: "bg-violet-600 text-white",
    dot: "bg-violet-500",
  },
  VIP_PLUS: {
    label: "VIP+",
    badge: "bg-amber-100 text-amber-800",
    card: "bg-gradient-to-b from-amber-50 to-yellow-100",
    accentText: "text-amber-700",
    solid: "bg-amber-500 text-white",
    dot: "bg-amber-500",
  },
};
