import { Lock, LockOpen } from "lucide-react";
import { TIER_STYLES } from "@/lib/tiers";
import type { AccessLevel } from "@/types";

/**
 * Malý lákavý zámeček s úrovní, kterou je potřeba odemknout.
 * Plná barva dané úrovně (FREE šedá / MEMBER modrá / VIP fialová / VIP+ zlatá).
 *
 * Jemná animace při hoveru (na zámečku i na rodičovské .group kartě):
 * zavřený zámek se nadzvedne, pootočí a rozevře v otevřený + decentní přiblížení.
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
      className={`group/lock inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide shadow-sm transition-all duration-300 ease-out hover:scale-110 hover:shadow-md group-hover:scale-110 group-hover:shadow-md ${t.solid} ${className}`}
    >
      <span className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        {/* zavřený zámek – při hoveru se nadzvedne, pootočí a zmizí */}
        <Lock
          className="absolute h-3.5 w-3.5 transition-all duration-300 ease-out group-hover/lock:-translate-y-1 group-hover/lock:rotate-12 group-hover/lock:opacity-0 group-hover:-translate-y-1 group-hover:rotate-12 group-hover:opacity-0"
          strokeWidth={2.5}
        />
        {/* otevřený zámek – při hoveru se objeví (lehce „doskočí") */}
        <LockOpen
          className="absolute h-3.5 w-3.5 scale-75 opacity-0 transition-all duration-300 ease-out group-hover/lock:scale-100 group-hover/lock:opacity-100 group-hover:scale-100 group-hover:opacity-100"
          strokeWidth={2.5}
        />
      </span>
      {t.label}
    </span>
  );
}
