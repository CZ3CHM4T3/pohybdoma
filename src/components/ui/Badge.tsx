import type { AccessLevel } from "@/types";
import { TIER_STYLES } from "@/lib/tiers";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "blue" | "dark" | "gray" | "green";
  className?: string;
}

export function Badge({ children, variant = "blue", className = "" }: BadgeProps) {
  const variants = {
    blue: "bg-brand-light text-brand-blue",
    dark: "bg-brand-dark text-white",
    gray: "bg-gray-100 text-gray-600",
    green: "bg-green-50 text-green-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function AccessBadge({ level }: { level: AccessLevel }) {
  const t = TIER_STYLES[level];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${t.badge}`}
    >
      {t.label}
    </span>
  );
}
