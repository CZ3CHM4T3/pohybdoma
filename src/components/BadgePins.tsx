import { BADGE_MAP, TIER_RING } from "@/lib/badges";

/** Malé odznaky u jména (přišpendlené v Síni slávy). */
export function BadgePins({ ids, size = 16 }: { ids?: string[] | null; size?: number }) {
  if (!ids || ids.length === 0) return null;
  return (
    <span className="ml-1 inline-flex items-center gap-0.5 align-middle">
      {ids.slice(0, 3).map((id) => {
        const b = BADGE_MAP[id];
        if (!b) return null;
        const Icon = b.Icon;
        return (
          <span
            key={id}
            title={b.name}
            className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br p-[1.5px] ${TIER_RING[b.tier]}`}
            style={{ width: size, height: size }}
          >
            <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
              <Icon className="h-[60%] w-[60%] text-brand-dark" strokeWidth={2} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
