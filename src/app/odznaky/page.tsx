import type { Metadata } from "next";
import {
  Flame, Activity, Trophy, BookOpen, CalendarCheck, Wand2, Users, HelpCircle, Lock, type LucideIcon,
} from "lucide-react";

export const metadata: Metadata = { title: "Odznaky (ukázka)" };

type Tier = "bronze" | "silver" | "gold";

const RING: Record<Tier, string> = {
  bronze: "from-amber-600 to-amber-800",
  silver: "from-slate-300 to-slate-500",
  gold: "from-yellow-300 to-amber-500",
};
const ICONBG: Record<Tier, string> = {
  bronze: "text-amber-700",
  silver: "text-slate-500",
  gold: "text-amber-500",
};

function Badge({
  Icon, title, sub, tier = "gold", unlocked = true, progress, hidden = false,
}: {
  Icon: LucideIcon; title: string; sub: string; tier?: Tier;
  unlocked?: boolean; progress?: { now: number; max: number }; hidden?: boolean;
}) {
  return (
    <div className={`card p-5 text-center ${unlocked ? "" : "opacity-95"}`}>
      {/* Medailon */}
      <div className="relative mx-auto mb-3 h-24 w-24">
        <div className={`h-full w-full rounded-full bg-gradient-to-br p-[3px] shadow-md ${unlocked ? RING[tier] : "from-gray-200 to-gray-300"}`}>
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
            {hidden && !unlocked ? (
              <span className="text-3xl font-bold text-gray-300">?</span>
            ) : (
              <Icon className={`h-10 w-10 ${unlocked ? ICONBG[tier] : "text-gray-300"}`} strokeWidth={1.8} />
            )}
          </div>
        </div>
        {/* lesk */}
        {unlocked && <span className="pointer-events-none absolute left-3 top-2 h-5 w-5 rounded-full bg-white/50 blur-[2px]" />}
        {/* zámek */}
        {!unlocked && (
          <span className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow ring-1 ring-black/5">
            <Lock className="h-3.5 w-3.5 text-gray-400" />
          </span>
        )}
        {/* odznak úrovně (zlato/stříbro/bronz) */}
        {unlocked && (
          <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow bg-gradient-to-br ${RING[tier]}`}>
            {tier === "gold" ? "zlato" : tier === "silver" ? "stříbro" : "bronz"}
          </span>
        )}
      </div>

      <h3 className={`text-sm font-semibold ${unlocked ? "text-brand-dark" : "text-gray-400"}`}>
        {hidden && !unlocked ? "Skrytý odznak" : title}
      </h3>
      <p className="mt-0.5 text-xs text-gray-400">{hidden && !unlocked ? "Objevíš ho aktivitou 🙂" : sub}</p>

      {progress && !unlocked && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-brand-blue" style={{ width: `${Math.min(100, Math.round((progress.now / progress.max) * 100))}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-gray-400">{progress.now}/{progress.max} · ještě {progress.max - progress.now}</p>
        </div>
      )}
    </div>
  );
}

export default function OdznakyUkazkaPage() {
  return (
    <div className="min-h-screen bg-brand-light py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-2">Náhled</p>
        <h1 className="text-3xl font-semibold text-brand-dark mb-2">Takhle můžou odznaky vypadat</h1>
        <p className="text-gray-500 mb-8">Ukázka vzhledu (statická) – odemčené, rozpracované i skryté.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <Badge Icon={Flame} title="Železná vůle" sub="100 dní v kuse" tier="gold" />
          <Badge Icon={Activity} title="Vytrvalec" sub="50 odcvičených videí" tier="silver" />
          <Badge Icon={BookOpen} title="Kronikář" sub="30 zápisů v deníku" tier="bronze" />
          <Badge Icon={Wand2} title="Skladatel" sub="10 lekcí v Mixéru" tier="gold" />
          <Badge Icon={Trophy} title="Stovkař" sub="100 odcvičených videí" tier="gold" unlocked={false} progress={{ now: 64, max: 100 }} />
          <Badge Icon={CalendarCheck} title="Disciplína" sub="30 dní v kuse" tier="silver" unlocked={false} progress={{ now: 12, max: 30 }} />
          <Badge Icon={Users} title="Síťař" sub="5 buddies" tier="bronze" unlocked={false} progress={{ now: 2, max: 5 }} />
          <Badge Icon={HelpCircle} title="Skrytý" sub="" hidden unlocked={false} />
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          Finální verze se bude plnit sama podle tvé aktivity + drobná oslava při zisku.
        </p>
      </div>
    </div>
  );
}
