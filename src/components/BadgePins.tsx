import { BADGE_MAP, badgeGradient, badgeIconColor } from "@/lib/badges";

/** Malé odznaky-medailony u jména (přišpendlené v Síni slávy). */
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
            className="inline-flex items-center justify-center rounded-full p-[1.5px] shadow-sm"
            style={{ width: size, height: size, background: badgeGradient(id) }}
          >
            <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
              <Icon className="h-[58%] w-[58%]" strokeWidth={2.2} style={{ color: badgeIconColor(id) }} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
