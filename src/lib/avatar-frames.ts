// Prémiové rámečky kolem profilové fotky – odměna za umístění v žebříčku.
// rank 1 → zlato, rank 2 → stříbro, rank 3 → bronz.
export type FrameKey = "bronze" | "silver" | "gold";

export const FRAMES: Record<FrameKey, { label: string; ring: string; glow: string; swatch: string }> = {
  bronze: {
    label: "Bronz",
    ring: "ring-amber-700",
    glow: "shadow-[0_0_14px_2px_rgba(180,83,9,0.55)]",
    swatch: "bg-gradient-to-br from-amber-500 to-amber-800",
  },
  silver: {
    label: "Stříbro",
    ring: "ring-slate-300",
    glow: "shadow-[0_0_14px_2px_rgba(148,163,184,0.65)]",
    swatch: "bg-gradient-to-br from-slate-200 to-slate-400",
  },
  gold: {
    label: "Zlato",
    ring: "ring-amber-400",
    glow: "shadow-[0_0_18px_3px_rgba(251,191,36,0.75)]",
    swatch: "bg-gradient-to-br from-amber-300 to-yellow-500",
  },
};

// Třídy na obal fotky (tlustý svítící rámeček).
export function frameClass(key: string | null | undefined): string {
  const f = key ? FRAMES[key as FrameKey] : undefined;
  return f ? `ring-4 ${f.ring} ${f.glow}` : "";
}

// Které rámečky má uživatel odemčené podle nejlepšího umístění (1–3).
export function unlockedFrames(bestRank: number | null): FrameKey[] {
  if (!bestRank || bestRank > 3) return [];
  const out: FrameKey[] = [];
  if (bestRank <= 3) out.push("bronze");
  if (bestRank <= 2) out.push("silver");
  if (bestRank <= 1) out.push("gold");
  return out;
}
