"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, GraduationCap, CalendarDays, Users, LineChart, Award } from "lucide-react";

const LINKS = [
  { href: "/ucet", label: "Přehled", Icon: LayoutDashboard },
  { href: "/videoknihovna", label: "Videa", Icon: BookOpen },
  { href: "/kurzy", label: "Kurzy", Icon: GraduationCap },
  { href: "/rezervace", label: "Rezervace", Icon: CalendarDays },
  { href: "/kruhy", label: "Kruhy", Icon: Users },
  { href: "/denik", label: "Deník", Icon: LineChart },
  { href: "/odznaky", label: "Odznaky", Icon: Award },
];

export function MemberNav() {
  const pathname = usePathname();
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 w-max min-w-full">
        {LINKS.map((l) => {
          const active = pathname === l.href || (l.href !== "/ucet" && pathname.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                active ? "bg-brand-blue text-white" : "text-gray-500 hover:bg-brand-light hover:text-brand-blue"
              }`}
            >
              <l.Icon className="h-4 w-4" strokeWidth={2} />
              {l.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
