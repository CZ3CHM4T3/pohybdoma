"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pin, Trash2, Send, Crown, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { normalizeTier } from "@/lib/tiers";

const EMOJIS = ["👍", "❤️", "🔥", "💪", "🙌"];

type Author = { full_name: string | null; tier: string | null; email: string | null } | null;
type Post = { id: string; author_id: string; body: string; pinned: boolean; created_at: string; author: Author };
type Comment = { id: string; post_id: string; author_id: string; body: string; created_at: string; author: Author };
type ReactionAgg = { counts: Record<string, number>; mine: Set<string> };

function authorName(a: Author): string {
  return a?.full_name?.trim() || a?.email?.split("@")[0] || "Člen";
}
function initials(a: Author): string {
  return (authorName(a)[0] ?? "Č").toUpperCase();
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "teď";
  if (m < 60) return `před ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `před ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `před ${d} dny`;
  return new Date(iso).toLocaleDateString("cs-CZ", { day: "numeric", month: "long" });
}

export default function KlubPage() {
  const supabase = createClient();

  const [phase, setPhase] = useState<"loading" | "anon" | "locked" | "ready">("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [reactions, setReactions] = useState<Record<string, ReactionAgg>>({});

  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const uidRef = useRef<string | null>(null);

  const loadAll = useCallback(async () => {
    const uid = uidRef.current;
    const [p, c, r] = await Promise.all([
      supabase
        .from("community_posts")
        .select("id, author_id, body, pinned, created_at, author:profiles!community_posts_author_id_fkey(full_name, tier, email)")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("community_comments")
        .select("id, post_id, author_id, body, created_at, author:profiles!community_comments_author_id_fkey(full_name, tier, email)")
        .order("created_at", { ascending: true }),
      supabase.from("community_reactions").select("post_id, user_id, emoji"),
    ]);

    if (p.data) setPosts(p.data as unknown as Post[]);
    if (c.data) {
      const map: Record<string, Comment[]> = {};
      for (const row of c.data as unknown as Comment[]) {
        (map[row.post_id] ??= []).push(row);
      }
      setComments(map);
    }
    if (r.data) {
      const map: Record<string, ReactionAgg> = {};
      for (const row of r.data as { post_id: string; user_id: string; emoji: string }[]) {
        const agg = (map[row.post_id] ??= { counts: {}, mine: new Set() });
        agg.counts[row.emoji] = (agg.counts[row.emoji] ?? 0) + 1;
        if (row.user_id === uid) agg.mine.add(row.emoji);
      }
      setReactions(map);
    }
  }, [supabase]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) { setPhase("anon"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("tier")
        .eq("id", user.id)
        .maybeSingle();
      const admin = isAdminEmail(user.email);
      const member = admin || normalizeTier(profile?.tier as string | undefined) === "VIP_PLUS";

      setUserId(user.id);
      uidRef.current = user.id;
      setIsAdmin(admin);

      if (!member) { setPhase("locked"); return; }
      setPhase("ready");
      await loadAll();

      channel = supabase
        .channel("klub")
        .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () => loadAll())
        .on("postgres_changes", { event: "*", schema: "public", table: "community_comments" }, () => loadAll())
        .on("postgres_changes", { event: "*", schema: "public", table: "community_reactions" }, () => loadAll())
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addPost() {
    if (!draft.trim() || !userId) return;
    setPosting(true);
    setError(null);
    const { error: err } = await supabase
      .from("community_posts")
      .insert({ author_id: userId, body: draft.trim() });
    setPosting(false);
    if (err) {
      setError("Příspěvek se nepodařilo uložit (" + err.message + "). Spustil jsi v Supabase community.sql?");
      return;
    }
    setDraft("");
    loadAll();
  }
  async function deletePost(id: string) {
    await supabase.from("community_posts").delete().eq("id", id);
    loadAll();
  }
  async function togglePin(id: string, pinned: boolean) {
    await supabase.from("community_posts").update({ pinned: !pinned }).eq("id", id);
    loadAll();
  }
  async function addComment(postId: string) {
    const text = (commentDraft[postId] ?? "").trim();
    if (!text || !userId) return;
    const { error } = await supabase
      .from("community_comments")
      .insert({ post_id: postId, author_id: userId, body: text });
    if (!error) {
      setCommentDraft((d) => ({ ...d, [postId]: "" }));
      loadAll();
    }
  }
  async function deleteComment(id: string) {
    await supabase.from("community_comments").delete().eq("id", id);
    loadAll();
  }
  async function toggleReaction(postId: string, emoji: string) {
    if (!userId) return;
    const mine = reactions[postId]?.mine?.has(emoji);
    if (mine) {
      await supabase
        .from("community_reactions")
        .delete()
        .eq("post_id", postId).eq("user_id", userId).eq("emoji", emoji);
    } else {
      await supabase.from("community_reactions").insert({ post_id: postId, user_id: userId, emoji });
    }
    loadAll();
  }

  // ── Stavy přístupu ──────────────────────────────────────────────────────
  if (phase === "loading") {
    return <Centered><p className="text-gray-400">Načítám klub…</p></Centered>;
  }
  if (phase === "anon") {
    return (
      <Centered>
        <Crown className="mx-auto mb-3 h-10 w-10 text-amber-500" strokeWidth={1.8} />
        <h1 className="text-xl font-semibold text-brand-dark mb-2">VIP+ Klub</h1>
        <p className="text-sm text-gray-500 mb-5">Uzavřená komunita pro členy VIP+. Přihlas se.</p>
        <Link href="/ucet" className="btn-primary">Přihlásit se</Link>
      </Centered>
    );
  }
  if (phase === "locked") {
    return (
      <Centered>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <Lock className="h-6 w-6 text-amber-600" strokeWidth={2} />
        </div>
        <h1 className="text-xl font-semibold text-brand-dark mb-2">VIP+ Klub je zamčený</h1>
        <p className="text-sm text-gray-500 mb-5">
          Tahle komunita je exkluzivní pro úroveň <strong className="text-amber-700">VIP+</strong> –
          přímý kontakt se mnou, sdílení pokroku a vzájemná podpora.
        </p>
        <Link href="/clenstvi" className="btn-primary bg-amber-500 hover:bg-amber-600">
          Odemknout s VIP+
        </Link>
      </Centered>
    );
  }

  // ── Klub ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-brand-light py-10">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* Hlavička */}
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-white shadow-sm">
            <Crown className="h-6 w-6" strokeWidth={2} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-brand-dark">VIP+ Klub</h1>
            <p className="text-sm text-gray-500">Naše uzavřená komunita. Piš, sdílej, ptej se.</p>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Composer */}
        <div className="card p-4 mb-6">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder={isAdmin ? "Napiš oznámení nebo příspěvek…" : "Co máš na srdci? Poděl se s klubem…"}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={addPost}
              disabled={posting || !draft.trim()}
              className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <Send className="h-4 w-4" strokeWidth={2} />
              {posting ? "Odesílám…" : "Sdílet"}
            </button>
          </div>
        </div>

        {/* Feed */}
        {posts.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">
            Zatím tu nic není. Buď první, kdo napíše! ✍️
          </p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const rx = reactions[post.id];
              const postComments = comments[post.id] ?? [];
              const honza = isAdminEmail(post.author?.email);
              return (
                <article key={post.id} className={`card p-5 ${post.pinned ? "ring-2 ring-amber-300" : ""}`}>
                  {post.pinned && (
                    <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      <Pin className="h-3 w-3" strokeWidth={2.5} /> Připnuto
                    </div>
                  )}

                  {/* Hlavička příspěvku */}
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${honza ? "bg-brand-dark" : "bg-amber-500"}`}>
                      {initials(post.author)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-dark flex items-center gap-1.5">
                        {authorName(post.author)}
                        {honza ? (
                          <span className="rounded-full bg-brand-dark px-1.5 py-0.5 text-[10px] font-bold text-white">LEKTOR</span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">VIP+</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
                    </div>
                    {/* Akce: připnutí (admin) + mazání (admin nebo vlastní) */}
                    {(isAdmin || post.author_id === userId) && (
                      <div className="ml-auto flex items-center gap-1">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => togglePin(post.id, post.pinned)}
                            title={post.pinned ? "Odepnout" : "Připnout"}
                            className={`p-1.5 rounded-md hover:bg-brand-light ${post.pinned ? "text-amber-600" : "text-gray-400"}`}
                          >
                            <Pin className="h-4 w-4" strokeWidth={2} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deletePost(post.id)}
                          title="Smazat"
                          className="p-1.5 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tělo */}
                  <p className="mt-3 text-sm text-brand-dark leading-relaxed whitespace-pre-wrap">{post.body}</p>

                  {/* Reakce */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {EMOJIS.map((emoji) => {
                      const count = rx?.counts[emoji] ?? 0;
                      const mine = rx?.mine?.has(emoji) ?? false;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => toggleReaction(post.id, emoji)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                            mine
                              ? "border-brand-blue bg-brand-light text-brand-blue font-semibold"
                              : "border-gray-200 text-gray-500 hover:border-brand-blue"
                          }`}
                        >
                          <span>{emoji}</span>
                          {count > 0 && <span>{count}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Komentáře */}
                  {postComments.length > 0 && (
                    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                      {postComments.map((c) => {
                        const cHonza = isAdminEmail(c.author?.email);
                        const mine = c.author_id === userId;
                        return (
                          <div key={c.id} className={`flex items-start gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
                            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${
                              mine ? "bg-brand-blue" : cHonza ? "bg-brand-dark" : "bg-amber-500"
                            }`}>
                              {mine ? "T" : initials(c.author)}
                            </span>
                            <div className={`min-w-0 max-w-[80%] rounded-xl px-3 py-2 ${
                              mine ? "bg-brand-blue text-white" : "bg-brand-light"
                            }`}>
                              <p className={`text-xs font-semibold flex items-center gap-1.5 ${
                                mine ? "text-white/90 flex-row-reverse" : "text-brand-dark"
                              }`}>
                                {mine ? "Ty" : authorName(c.author)}
                                {cHonza && !mine && <span className="rounded-full bg-brand-dark px-1.5 text-[9px] font-bold text-white">LEKTOR</span>}
                                <span className={`font-normal ${mine ? "text-white/60" : "text-gray-400"}`}>· {timeAgo(c.created_at)}</span>
                              </p>
                              <p className={`text-sm whitespace-pre-wrap ${mine ? "text-white" : "text-brand-dark"}`}>{c.body}</p>
                            </div>
                            {(isAdmin || mine) && (
                              <button
                                type="button"
                                onClick={() => deleteComment(c.id)}
                                className="mt-1 p-1 text-gray-300 hover:text-red-600"
                                title="Smazat komentář"
                              >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Přidat komentář */}
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={commentDraft[post.id] ?? ""}
                      onChange={(e) => setCommentDraft((d) => ({ ...d, [post.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") addComment(post.id); }}
                      placeholder="Napiš komentář…"
                      className="flex-1 rounded-full border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                    <button
                      type="button"
                      onClick={() => addComment(post.id)}
                      disabled={!(commentDraft[post.id] ?? "").trim()}
                      className="shrink-0 rounded-full bg-brand-blue p-2 text-white disabled:opacity-30"
                      aria-label="Odeslat komentář"
                    >
                      <Send className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                </article>
              );
            })}
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
