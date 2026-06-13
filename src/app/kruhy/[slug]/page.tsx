"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Users, ArrowLeft, MessagesSquare, Send, ImagePlus, X, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeTier } from "@/lib/tiers";
import { getDemoTierClient } from "@/lib/demo-client";
import { AuthorName } from "@/components/AuthorName";
import type { UserTier } from "@/types";

type Circle = { id: string; slug: string; name: string; description: string | null; member_count: number };
type Member = { user_id: string; display_name: string | null };
type CPost = { id: string; author_id: string; author_name: string | null; body: string; image_url: string | null; created_at: string };

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

  const [posts, setPosts] = useState<CPost[]>([]);
  const [pins, setPins] = useState<Record<string, string[]>>({});
  const [pBody, setPBody] = useState("");
  const [pFile, setPFile] = useState<File | null>(null);
  const [pPreview, setPPreview] = useState<string | null>(null);
  const [pSending, setPSending] = useState(false);

  async function loadMembers(circleId: string) {
    const { data } = await supabase
      .from("circle_members")
      .select("user_id, display_name")
      .eq("circle_id", circleId)
      .order("joined_at");
    setMembers((data ?? []) as Member[]);
  }
  async function loadPosts(circleId: string) {
    const { data } = await supabase
      .from("circle_posts")
      .select("id, author_id, author_name, body, image_url, created_at")
      .eq("circle_id", circleId)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as CPost[];
    setPosts(list);
    const ids = Array.from(new Set(list.map((p) => p.author_id)));
    if (ids.length) {
      const { data: pinData } = await supabase.rpc("pinned_for", { p_ids: ids });
      const map: Record<string, string[]> = {};
      for (const r of (pinData ?? []) as { id: string; pinned_badges: string[] }[]) map[r.id] = r.pinned_badges ?? [];
      setPins(map);
    }
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
        if (isIn) { await loadMembers((c as Circle).id); await loadPosts((c as Circle).id); }
      } else {
        setTier(getDemoTierClient() ?? "FREE"); // demo/ukázka
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
    await loadPosts(circle.id);
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

  function pickImage(file: File) {
    setPFile(file);
    setPPreview(URL.createObjectURL(file));
  }
  function clearImage() {
    setPFile(null);
    if (pPreview) URL.revokeObjectURL(pPreview);
    setPPreview(null);
  }
  async function sendPost() {
    if (!userId || !circle || pSending) return;
    if (!pBody.trim() && !pFile) return;
    setPSending(true);
    setError(null);
    let imageUrl: string | null = null;
    if (pFile) {
      const ext = (pFile.name.split(".").pop() || "jpg").toLowerCase();
      const path = `circles/${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("community").upload(path, pFile, { upsert: true });
      if (upErr) { setPSending(false); setError("Nahrání obrázku selhalo: " + upErr.message); return; }
      imageUrl = supabase.storage.from("community").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("circle_posts").insert({
      circle_id: circle.id, author_id: userId, body: pBody.trim(), image_url: imageUrl,
    });
    setPSending(false);
    if (error) { setError("Odeslání selhalo: " + error.message); return; }
    setPBody("");
    clearImage();
    await loadPosts(circle.id);
  }
  async function deletePost(id: string) {
    const { error } = await supabase.from("circle_posts").delete().eq("id", id);
    if (error) { setError("Smazání selhalo: " + error.message); return; }
    setPosts((arr) => arr.filter((p) => p.id !== id));
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

            {/* Diskuse */}
            <div className="card p-6">
              <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-dark">
                <MessagesSquare className="h-4 w-4 text-brand-blue" /> Diskuse
              </h2>

              {/* Composer */}
              <div className="mb-5 rounded-xl border border-gray-100 p-3">
                <textarea
                  value={pBody}
                  onChange={(e) => setPBody(e.target.value)}
                  rows={2}
                  placeholder="Napiš něco do kruhu…"
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
                {pPreview && (
                  <div className="relative mt-2 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pPreview} alt="" className="max-h-40 rounded-lg" />
                    <button onClick={clearImage} className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow ring-1 ring-black/10" aria-label="Odebrat obrázek">
                      <X className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline">
                    <ImagePlus className="h-4 w-4" /> Obrázek
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f); e.target.value = ""; }} />
                  </label>
                  <button
                    onClick={sendPost}
                    disabled={pSending || (!pBody.trim() && !pFile)}
                    className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" /> {pSending ? "Odesílám…" : "Odeslat"}
                  </button>
                </div>
              </div>

              {/* Feed */}
              {posts.length === 0 ? (
                <p className="text-sm text-gray-400">Zatím tu nic není – buď první, kdo napíše. 🙂</p>
              ) : (
                <div className="space-y-4">
                  {posts.map((p) => (
                    <div key={p.id} className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs font-semibold text-white">
                        {(p.author_name?.[0] ?? "Č").toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <AuthorName id={p.author_id} name={p.author_name} pins={pins[p.author_id]} />{" "}
                          <span className="text-xs text-gray-400">
                            {new Date(p.created_at).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </p>
                        {p.body && <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700">{p.body}</p>}
                        {p.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt="" className="mt-2 max-h-72 rounded-lg" />
                        )}
                      </div>
                      {p.author_id === userId && (
                        <button onClick={() => deletePost(p.id)} className="shrink-0 text-gray-300 hover:text-red-500" aria-label="Smazat">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
