import { BADGE_MAP, TIER_RING, TIER_ICON, TIER_GLOW } from "@/lib/badges";

/** Malé odznaky-medailony u jména (přišpendlené v Síni slávy). */
export function BadgePins({ ids, size = 16 }: { ids?: string[] | null; size?: number }) {
  if (!ids || ids.length === 0) return null;
  return (
    <span className="ml-1 inline-flex items-center gap-0.5 align-middle">
      {ids.slice(0, 3).map((id) => {
        const b = BADGE_MAP[id];
        if (!b) return null;
        const Icon = b.Icon;
        const glow = b.tier === "gold" || b.tier === "legend" ? TIER_GLOW[b.tier] : "";
        return (
          <span
            key={id}
            title={b.name}
            className={`inline-flex items-center justify-center rounded-full p-[1.5px] bg-gradient-to-br ${TIER_RING[b.tier]} ${glow}`}
            style={{ width: size, height: size }}
          >
            <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
              <Icon className={`h-[58%] w-[58%] ${TIER_ICON[b.tier]}`} strokeWidth={2.2} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
