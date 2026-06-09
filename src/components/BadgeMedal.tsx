import { BADGE_MAP, TIER_RING, TIER_ICON, TIER_GLOW } from "@/lib/badges";

/** 3D medailon (esport vibe) – vystupuje z pozadí, gradient rim, lesk, stín. */
export function BadgeMedal({ id, earned = true, size = 80 }: { id: string; earned?: boolean; size?: number }) {
  const b = BADGE_MAP[id];
  if (!b) return null;
  const Icon = b.Icon;
  const ring = earned ? `${TIER_RING[b.tier]} ${TIER_GLOW[b.tier]}` : "from-gray-300 to-gray-400";
  return (
    <div
      className="relative inline-block"
      style={{ width: size, height: size, filter: earned ? "drop-shadow(0 6px 8px rgba(0,0,0,.30))" : "drop-shadow(0 3px 4px rgba(0,0,0,.15))" }}
    >
      {/* vnější rim */}
      <div className={`h-full w-full rounded-full bg-gradient-to-br ${ring}`} style={{ padding: Math.max(2, size * 0.1) }}>
        {/* vnitřní disk */}
        <div
          className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${earned ? "from-white to-gray-200" : "from-gray-100 to-gray-200"}`}
          style={{ boxShadow: "inset 0 2px 4px rgba(255,255,255,.7), inset 0 -3px 6px rgba(0,0,0,.18)" }}
        >
          <Icon
            className={earned ? TIER_ICON[b.tier] : "text-gray-400"}
            style={{ width: size * 0.46, height: size * 0.46, filter: "drop-shadow(0 1px 1px rgba(0,0,0,.3))" }}
            strokeWidth={2.2}
          />
          {/* horní lesk */}
          <span
            className="pointer-events-none absolute rounded-full bg-white/55 blur-md"
            style={{ width: size * 0.55, height: size * 0.4, top: -size * 0.08, left: size * 0.08 }}
          />
        </div>
      </div>
    </div>
  );
}
