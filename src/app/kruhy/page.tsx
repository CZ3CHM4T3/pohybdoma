"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Search, Plus, X, Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { normalizeTier } from "@/lib/tiers";
import { getDemoTierClient } from "@/lib/demo-client";
import type { UserTier } from "@/types";

type Circle = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  member_count: number;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export default function KruhyPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [tier, setTier] = useState<UserTier>("FREE");
  const [isAdmin, setIsAdmin] = useState(false);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [cName, setCName] = useState("");
  const [cDesc, setCDesc] = useState("");

  async function loadCircles() {
    const { data } = await supabase
      .from("circles")
      .select("id, slug, name, description, member_count")
      .order("member_count", { ascending: false })
      .order("name");
    setCircles((data ?? []) as Circle[]);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (user) {
        setUserId(user.id);
        setIsAdmin(isAdminEmail(user.email));
        const { data: p } = await supabase.from("profiles").select("tier").eq("id", user.id).maybeSingle();
        setTier(normalizeTier(p?.tier as string | undefined));
        const { data: m } = await supabase.from("circle_members").select("circle_id").eq("user_id", user.id);
        setJoined(new Set((m ?? []).map((r: { circle_id: string }) => r.circle_id)));
      } else {
        setTier(getDemoTierClient() ?? "FREE"); // demo/ukázka
      }
      await loadCircles();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canCreate = isAdmin || tier === "VIP_PLUS";
  const canJoin = !!userId && tier !== "FREE";

  async function join(c: Circle) {
    if (!userId) return;
    setError(null);
    const { error } = await supabase.from("circle_members").insert({ circle_id: c.id, user_id: userId });
    if (error) { setError("Připojení selhalo: " + error.message); return; }
    setJoined((s) => new Set(s).add(c.id));
    setCircles((arr) => arr.map((x) => (x.id === c.id ? { ...x, member_count: x.member_count + 1 } : x)));
  }
  async function leave(c: Circle) {
    if (!userId) return;
    setError(null);
    const { error } = await supabase.from("circle_members").delete().eq("circle_id", c.id).eq("user_id", userId);
    if (error) { setError("Odchod selhal: " + error.message); return; }
    setJoined((s) => { const n = new Set(s); n.delete(c.id); return n; });
    setCircles((arr) => arr.map((x) => (x.id === c.id ? { ...x, member_count: Math.max(0, x.member_count - 1) } : x)));
  }
  async function createCircle(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !cName.trim()) return;
    setError(null);
    const slug = `${slugify(cName)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from("circles")
      .insert({ slug, name: cName.trim(), description: cDesc.trim() || null, created_by: userId })
      .select("id, slug, name, description, member_count")
      .single();
    if (error || !data) { setError("Kruh se nepodařilo založit: " + (error?.message ?? "")); return; }
    // zakladatel se rovnou přidá
    await supabase.from("circle_members").insert({ circle_id: data.id, user_id: userId });
    setCName(""); setCDesc(""); setCreating(false);
    setJoined((s) => new Set(s).add(data.id));
    await loadCircles();
  }

  const list = circles.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-brand-light py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-2 flex items-center gap-2">
          <Users className="h-6 w-6 text-brand-blue" strokeWidth={2} />
          <h1 className="text-3xl lg:text-4xl font-semibold text-brand-dark">Kruhy</h1>
        </div>
        <p className="text-gray-500 mb-6 max-w-2xl">
          Najdi lidi, kteří řeší to samé co ty. Přidej se a potkávej <strong>buddies</strong> se
          stejným zaměřením. Jména členů uvidíš po přidání do kruhu.
        </p>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {/* Hledání + založit */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Hledat kruh…"
              className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              className="btn-primary text-sm inline-flex items-center gap-2"
            >
              {creating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {creating ? "Zavřít" : "Založit kruh"}
            </button>
          )}
        </div>

        {/* Formulář založení (VIP+) */}
        {creating && canCreate && (
          <form onSubmit={createCircle} className="card p-5 mb-6 space-y-3">
            <input
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              placeholder="Název kruhu (např. Běžci)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            <textarea
              value={cDesc}
              onChange={(e) => setCDesc(e.target.value)}
              rows={2}
              placeholder="Krátký popis – pro koho kruh je"
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            <button type="submit" className="btn-primary text-sm">Vytvořit kruh</button>
          </form>
        )}

        {/* Hláška o oprávnění */}
        {userId && !canCreate && (
          <p className="mb-6 text-xs text-gray-400">
            Zakládat nové kruhy mohou členové <strong className="text-amber-700">VIP+</strong>.{" "}
            <Link href="/clenstvi" className="text-brand-blue hover:underline">Zjistit více →</Link>
          </p>
        )}

        {/* Kruhy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c) => {
            const isIn = joined.has(c.id);
            return (
              <div key={c.id} className="card card-3d p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand-blue">
                    <Users className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div>
                    <h2 className="font-semibold text-brand-dark leading-tight">{c.name}</h2>
                    <p className="text-xs text-gray-400">{c.member_count} členů</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed flex-1">{c.description}</p>

                <div className="mt-4 flex items-center gap-2">
                  {!userId ? (
                    <Link href="/ucet" className="btn-outline text-sm w-full text-center">Přihlas se</Link>
                  ) : isIn ? (
                    <>
                      <Link href={`/kruhy/${c.slug}`} className="btn-primary text-sm flex-1 text-center">Otevřít</Link>
                      <button type="button" onClick={() => leave(c)} className="text-xs font-semibold text-gray-400 hover:text-red-600">Odejít</button>
                    </>
                  ) : canJoin ? (
                    <button type="button" onClick={() => join(c)} className="btn-primary text-sm w-full">Připojit se</button>
                  ) : (
                    <Link href="/clenstvi" className="btn-outline text-sm w-full text-center">Jen pro členy →</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {list.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-10">Žádný kruh neodpovídá hledání.</p>
        )}
      </div>
    </div>
  );
}
