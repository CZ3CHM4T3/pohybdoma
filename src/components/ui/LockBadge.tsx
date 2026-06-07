import { Lock } from "lucide-react";
import { TIER_STYLES } from "@/lib/tiers";
import type { AccessLevel } from "@/types";

/**
 * Malý lákavý zámeček s úrovní, kterou je potřeba odemknout.
 * Plná barva dané úrovně (FREE šedá / MEMBER modrá / VIP fialová / VIP+ zlatá).
 */
export function LockBadge({
  level,
  className = "",
}: {
  level: AccessLevel;
  className?: string;
}) {
  const t = TIER_STYLES[level];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide shadow-sm ${t.solid} ${className}`}
    >
      <Lock className="h-3 w-3" strokeWidth={2.5} />
      {t.label}
    </span>
  );
}
