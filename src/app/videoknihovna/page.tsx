"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import type { BodyPart, Difficulty, AccessLevel, UserTier } from "@/types";
import { MOCK_VIDEOS } from "@/lib/mock-data";
import { VideoCard } from "@/components/VideoCard";
import { TIER_STYLES, normalizeTier } from "@/lib/tiers";
import { createClient } from "@/lib/supabase/client";

const BODY_PARTS: BodyPart[] = ["záda", "noha", "kyčle", "rameno", "krk", "dech", "celé tělo", "core"];
const DIFFICULTIES: Difficulty[] = ["začátečník", "mírně pokročilý", "pokročilý"];
const ACCESS_LEVELS: { label: string; value: AccessLevel | "all" }[] = [
  { label: "Vše", value: "all" },
  { label: TIER_STYLES.FREE.label, value: "FREE" },
  { label: TIER_STYLES.MEMBER.label, value: "MEMBER" },
  { label: TIER_STYLES.VIP.label, value: "VIP" },
  { label: TIER_STYLES.VIP_PLUS.label, value: "VIP_PLUS" },
];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
        active
          ? "bg-brand-blue text-white"
          : "bg-gray-100 text-gray-600 hover:bg-brand-light hover:text-brand-blue"
      }`}
    >
      {label}
    </button>
  );
}

export default function VideoknihovnaPage() {
  const [bodyPart, setBodyPart] = useState<BodyPart | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [access, setAccess] = useState<AccessLevel | "all">("all");
  const [search, setSearch] = useState("");
  const [userTier, setUserTier] = useState<UserTier>("FREE");

  // Načti úroveň členství přihlášeného uživatele (kvůli odemykání videí).
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("tier")
        .eq("id", data.user.id)
        .maybeSingle();
      setUserTier(normalizeTier(profile?.tier as string | undefined));
    });
  }, []);

  const filtered = useMemo(() => {
    return MOCK_VIDEOS.filter((v) => {
      if (bodyPart && !v.bodyParts.includes(bodyPart)) return false;
      if (difficulty && v.difficulty !== difficulty) return false;
      if (access !== "all" && v.accessLevel !== access) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!v.title.toLowerCase().includes(q) && !v.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [bodyPart, difficulty, access, search]);

  return (
    <>
      {/* Header */}
      <section className="bg-brand-light py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-2">Knihovna pohybu</p>
          <h1 className="text-4xl lg:text-5xl font-semibold text-brand-dark mb-4">
            Videa pro každé tělo
          </h1>
          <p className="text-lg text-gray-600 max-w-xl">
            Filtrujte dle části těla, obtížnosti nebo úrovně přístupu. FREE videa jsou okamžitě dostupná.
          </p>
        </div>
      </section>

      {/* Filters + Grid */}
      <section className="bg-white py-10 lg:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Search */}
          <div className="mb-6">
            <input
              type="search"
              placeholder="Hledat video..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
            />
          </div>

          {/* Filters */}
          <div className="space-y-4 mb-8">
            {/* Body parts */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Část těla</p>
              <div className="flex flex-wrap gap-2">
                <Chip label="Vše" active={bodyPart === null} onClick={() => setBodyPart(null)} />
                {BODY_PARTS.map((bp) => (
                  <Chip key={bp} label={bp} active={bodyPart === bp} onClick={() => setBodyPart(bodyPart === bp ? null : bp)} />
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Obtížnost</p>
              <div className="flex flex-wrap gap-2">
                <Chip label="Vše" active={difficulty === null} onClick={() => setDifficulty(null)} />
                {DIFFICULTIES.map((d) => (
                  <Chip key={d} label={d} active={difficulty === d} onClick={() => setDifficulty(difficulty === d ? null : d)} />
                ))}
              </div>
            </div>

            {/* Access */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Přístup</p>
              <div className="flex flex-wrap gap-2">
                {ACCESS_LEVELS.map((al) => (
                  <Chip key={al.value} label={al.label} active={access === al.value} onClick={() => setAccess(al.value)} />
                ))}
              </div>
            </div>
          </div>

          {/* Results count */}
          <p className="text-sm text-gray-500 mb-6">
            Zobrazeno: <strong className="text-brand-dark">{filtered.length}</strong> videí
          </p>

          {/* Grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((video) => (
                <VideoCard key={video.id} video={video} userTier={userTier} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-gray-400">
              <div className="text-5xl mb-4">🔍</div>
              <p className="font-semibold">Žádná videa nenalezena</p>
              <p className="text-sm mt-1">Zkuste změnit filtry nebo hledaný výraz.</p>
            </div>
          )}

          {/* VIP upsell */}
          <div className="mt-12 p-6 lg:p-8 rounded-2xl bg-gradient-to-r from-brand-dark to-[#1256c0] text-white flex flex-col sm:flex-row items-center gap-6 justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-1">Chceš přístup ke všem videím?</h3>
              <p className="text-white/75 text-sm">Knihovna roste každý týden. Členství od 199 Kč / měsíc.</p>
            </div>
            <Link href="/clenstvi" className="btn-primary shrink-0 bg-white text-brand-dark hover:opacity-90 py-3 px-6">
              Zobrazit členství
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
