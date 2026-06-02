import type { AccessLevel } from "@/types";

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
  if (level === "FREE") return <Badge variant="green">ZDARMA</Badge>;
  if (level === "MEMBER") return <Badge variant="blue">MEMBER</Badge>;
  if (level === "VIP") return <Badge variant="dark">VIP</Badge>;
  return <Badge variant="dark">VIP PLUS</Badge>;
}
