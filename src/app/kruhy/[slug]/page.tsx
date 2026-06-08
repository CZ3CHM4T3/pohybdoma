"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Users, ArrowLeft, MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeTier } from "@/lib/tiers";
import type { UserTier } from "@/types";

type Circle = { id: string; slug: string; name: string; description: string | null; member_count: number };
type Member = { user_id: string; display_name: string | null };

export default function CircleDetailPage() {
  const supabase = createClient();
  const params = useParams();
  const slug = String(params?.slug ?? "");

  const [phase, setPhase] = useState<"loading" | "notfound" | "ready">("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [tier, setTier] = useState<UserTier>("FREE");
  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMembers(circleId: string) {
    const { data } = await supabase
      .from("circle_members")
      .select("user_id, display_name")
      .eq("circle_id", circleId)
      .order("joined_at");
    setMembers((data ?? []) as Member[]);
  }

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("circles")
        .select("id, slug, name, description, member_count")
        .eq("slug", slug)
        .maybeSingle();
      if (!c) { setPhase("notfound"); return; }
      setCircle(c as Circle);

      const { data: au } = await supabase.auth.getUser();
      const user = au.user;
      if (user) {
        setUserId(user.id);
        const { data: p } = await supabase.from("profiles").select("tier").eq("id", user.id).maybeSingle();
        setTier(normalizeTier(p?.tier as string | undefined));
        const { data: mine } = await supabase
          .from("circle_members")
          .select("circle_id")
          .eq("circle_id", (c as Circle).id)
          .eq("user_id", user.id)
          .maybeSingle();
        const isIn = !!mine;
        setJoined(isIn);
        if (isIn) await loadMembers((c as Circle).id);
      }
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const canJoin = !!userId && tier !== "FREE";

  async function join() {
    if (!userId || !circle) return;
    setError(null);
    const { error } = await supabase.from("circle_members").insert({ circle_id: circle.id, user_id: userId });
    if (error) { setError("Připojení selhalo: " + error.message); return; }
    setJoined(true);
    setCircle({ ...circle, member_count: circle.member_count + 1 });
    await loadMembers(circle.id);
  }
  async function leave() {
    if (!userId || !circle) return;
    setError(null);
    const { error } = await supabase.from("circle_members").delete().eq("circle_id", circle.id).eq("user_id", userId);
    if (error) { setError("Odchod selhal: " + error.message); return; }
    setJoined(false);
    setMembers([]);
    setCircle({ ...circle, member_count: Math.max(0, circle.member_count - 1) });
  }

  if (phase === "loading") {
    return <Centered><p className="text-gray-400">Načítám…</p></Centered>;
  }
  if (phase === "notfound" || !circle) {
    return (
      <Centered>
        <p className="text-brand-dark font-semibold mb-3">Kruh nenalezen.</p>
        <Link href="/kruhy" className="btn-primary">Zpět na kruhy</Link>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light py-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link href="/kruhy" className="inline-flex items-center gap-2 text-sm text-brand-blue font-semibold mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Zpět na kruhy
        </Link>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <div className="card p-6 mb-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light text-brand-blue shrink-0">
              <Users className="h-6 w-6" strokeWidth={2} />
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-brand-dark">{circle.name}</h1>
              <p className="text-sm text-gray-400">{circle.member_count} členů</p>
              {circle.description && <p className="mt-2 text-gray-600">{circle.description}</p>}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            {!userId ? (
              <Link href="/ucet" className="btn-primary text-sm">Přihlas se</Link>
            ) : joined ? (
              <button type="button" onClick={leave} className="text-sm font-semibold text-gray-400 hover:text-red-600">Odejít z kruhu</button>
            ) : canJoin ? (
              <button type="button" onClick={join} className="btn-primary text-sm">Připojit se</button>
            ) : (
              <Link href="/clenstvi" className="btn-outline text-sm">Připojení je pro členy (MEMBER+) →</Link>
            )}
          </div>
        </div>

        {/* Členové – jen pro členy kruhu */}
        {joined ? (
          <>
            <div className="card p-6 mb-6">
              <h2 className="text-sm font-semibold text-brand-dark mb-3">Členové ({members.length})</h2>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <span key={m.user_id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-sm text-brand-dark">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue text-[10px] font-semibold text-white">
                      {(m.display_name?.[0] ?? "Č").toUpperCase()}
                    </span>
                    {m.display_name ?? "Člen"}
                  </span>
                ))}
              </div>
            </div>

            <div className="card p-6 text-center text-gray-500">
              <MessagesSquare className="mx-auto mb-2 h-7 w-7 text-brand-blue" strokeWidth={1.8} />
              <p className="text-sm">Diskuze v kruhu se připravuje. Zatím se tu poznáváte s ostatními členy. 🙂</p>
            </div>
          </>
        ) : (
          <div className="card p-6 text-center text-gray-500">
            <p className="text-sm">Členy a obsah kruhu uvidíš po přidání.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center px-4">
      <div className="card p-8 text-center max-w-sm">{children}</div>
    </div>
  );
}
