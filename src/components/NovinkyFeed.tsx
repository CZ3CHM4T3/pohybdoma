"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Newspaper, Film, Users, Flame, Radio, ChevronRight, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Item = {
  key: string;
  type: "video" | "kruh" | "vyzva" | "live";
  title: string;
  sub: string;
  href: string;
  date: number; // timestamp pro řazení
  Icon: LucideIcon;
  tint: string;
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const d = Math.floor(diff / 86_400_000);
  if (d <= 0) return "dnes";
  if (d === 1) return "včera";
  if (d < 7) return `před ${d} dny`;
  const w = Math.floor(d / 7);
  if (w === 1) return "před týdnem";
  if (w < 5) return `před ${w} týdny`;
  const m = Math.floor(d / 30);
  return m <= 1 ? "před měsícem" : `před ${m} měsíci`;
}

export function NovinkyFeed() {
  const supabase = createClient();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    (async () => {
      const [vids, circles, ch, streams] = await Promise.all([
        supabase.from("videos").select("slug, title, created_at").eq("published", true).order("created_at", { ascending: false }).limit(4),
        supabase.from("circles").select("slug, name, created_at").order("created_at", { ascending: false }).limit(2),
        supabase.from("challenges").select("title, created_at").eq("active", true).order("created_at", { ascending: false }).limit(1),
        supabase.from("streams").select("title, starts_at").order("starts_at", { ascending: false }).limit(1),
      ]);

      const list: Item[] = [];
      for (const v of vids.data ?? []) {
        list.push({
          key: "v" + v.slug, type: "video", title: v.title as string, sub: "Nové video v knihovně",
          href: `/videoknihovna/${v.slug}`, date: new Date(v.created_at as string).getTime(),
          Icon: Film, tint: "bg-violet-50 text-violet-600",
        });
      }
      for (const c of circles.data ?? []) {
        list.push({
          key: "c" + c.slug, type: "kruh", title: c.name as string, sub: "Nový kruh — přidej se",
          href: `/kruhy/${c.slug}`, date: new Date(c.created_at as string).getTime(),
          Icon: Users, tint: "bg-orange-50 text-orange-600",
        });
      }
      const chRow = (ch.data ?? [])[0];
      if (chRow) {
        list.push({
          key: "ch", type: "vyzva", title: chRow.title as string, sub: "Aktuální měsíční výzva",
          href: "/ucet", date: new Date(chRow.created_at as string).getTime(),
          Icon: Flame, tint: "bg-amber-50 text-amber-600",
        });
      }
      const stRow = (streams.data ?? [])[0];
      if (stRow) {
        const ts = new Date(stRow.starts_at as string).getTime();
        const upcoming = ts > Date.now();
        list.push({
          key: "st", type: "live", title: stRow.title as string,
          sub: upcoming ? "Plánovaný LIVE přenos" : "Záznam z LIVE přenosu",
          href: "/klub/live", date: ts, Icon: Radio, tint: "bg-red-50 text-red-600",
        });
      }

      list.sort((a, b) => b.date - a.date);
      const top = list.slice(0, 5);
      setItems(top);
      setLoading(false);

      // "Ťuplík" – něco nového od poslední návštěvy
      const newest = top[0]?.date ?? 0;
      if (typeof window !== "undefined" && newest > 0) {
        const seen = Number(localStorage.getItem("ucet_novinky_seen") || 0);
        setHasNew(newest > seen);
        // po chvíli označ za přečtené (zmizí až při příští návštěvě)
        setTimeout(() => localStorage.setItem("ucet_novinky_seen", String(newest)), 4000);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || items.length === 0) return null;

  return (
    <div className="card p-5 mb-6">
      <div className="mb-4 flex flex-col items-center text-center">
        <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <Newspaper className="h-5 w-5" strokeWidth={2} />
          {hasNew && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </span>
        <h2 className="mt-2 text-xl font-bold text-brand-dark">Novinky</h2>
        <span className="text-xs text-gray-400">co je nového v POHYB DOMA</span>
      </div>
      <ul className="divide-y divide-gray-100">
        {items.map((it) => (
          <li key={it.key}>
            <Link href={it.href} className="group flex items-center gap-3 py-2.5 -mx-1 px-1 rounded-lg hover:bg-gray-50">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${it.tint}`}>
                <it.Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-brand-dark">{it.title}</p>
                <p className="truncate text-xs text-gray-400">{it.sub} · {timeAgo(it.date)}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-brand-blue" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
