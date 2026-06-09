import { BADGE_MAP } from "@/lib/badges";
import { BadgeMedal } from "@/components/BadgeMedal";

/** Přišpendlené odznaky u jména – 3D medailony, dobře rozlišitelné. */
export function BadgePins({ ids, size = 24 }: { ids?: string[] | null; size?: number }) {
  if (!ids || ids.length === 0) return null;
  return (
    <span className="ml-1 inline-flex items-center gap-1 align-middle">
      {ids.slice(0, 3).map((id) =>
        BADGE_MAP[id] ? <BadgeMedal key={id} id={id} size={size} /> : null
      )}
    </span>
  );
}
