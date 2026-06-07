import { Lock, LockOpen } from "lucide-react";
import { TIER_STYLES } from "@/lib/tiers";
import type { AccessLevel } from "@/types";

/**
 * Malý lákavý zámeček s úrovní, kterou je potřeba odemknout.
 * Plná barva dané úrovně (FREE šedá / MEMBER modrá / VIP fialová / VIP+ zlatá).
 *
 * Jemná animace při hoveru (na zámečku i na rodičovské .group kartě):
 * zavřený zámek se plynule rozevře v otevřený + decentní přiblížení.
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
      className={`group/lock inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide shadow-sm transition-transform duration-300 ease-out hover:scale-105 group-hover:scale-105 ${t.solid} ${className}`}
    >
      <span className="relative h-3 w-3 shrink-0">
        {/* zavřený zámek – při hoveru se nadzvedne a zmizí */}
        <Lock
          className="absolute inset-0 h-3 w-3 transition-all duration-300 ease-out group-hover/lock:-translate-y-px group-hover/lock:opacity-0 group-hover:-translate-y-px group-hover:opacity-0"
          strokeWidth={2.5}
        />
        {/* otevřený zámek – při hoveru se objeví */}
        <LockOpen
          className="absolute inset-0 h-3 w-3 opacity-0 transition-all duration-300 ease-out group-hover/lock:opacity-100 group-hover:opacity-100"
          strokeWidth={2.5}
        />
      </span>
      {t.label}
    </span>
  );
}
