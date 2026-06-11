import { Crown } from "lucide-react";

// Odznak zakladatele (lektor) – zlatofialový, na první pohled jasný.
export function FounderBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ${className}`}
    >
      <Crown className="h-3 w-3" strokeWidth={2.5} /> Zakladatel
    </span>
  );
}
