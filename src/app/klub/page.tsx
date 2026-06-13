"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Pin, Trash2, Send, Crown, Lock, MessageCircle, HelpCircle, CornerDownRight,
  ImagePlus, X, BarChart3, Star, Plus, Check, ThumbsUp, ThumbsDown, Flame, Laugh,
  Frown, HeartHandshake, Wand2, Radio, Users, Film, Calculator, Megaphone, type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { normalizeTier } from "@/lib/tiers";
import { getDemoTierClient } from "@/lib/demo-client";
import { PREVIEW_MODE } from "@/lib/preview";
import { BadgePins } from "@/components/BadgePins";
import { FounderBadge } from "@/components/FounderBadge";

const TABS: { key: Channel; label: string; Icon: LucideIcon }[] = [
  { key: "nastenka", label: "Nástěnka", Icon: Megaphone },
  { key: "chat", label: "Chat", Icon: MessageCircle },
  { key: "qa", label: "Q&A", Icon: HelpCircle },
  { key: "poll", label: "Ankety", Icon: BarChart3 },
  { key: "feedback", label: "Feedback", Icon: Star },
];

// Reakce jako profesionální lucide ikony (klíč se ukládá do DB jako text).
const REACTIONS: { key: string; Icon: LucideIcon; title: string }[] = [
  { key: "like", Icon: ThumbsUp, title: "Líbí" },
  { key: "dislike", Icon: ThumbsDown, title: "Nelíbí" },
  { key: "fire", Icon: Flame, title: "Hustý" },
  { key: "haha", Icon: Laugh, title: "Haha" },
  { key: "sad", Icon: Frown, title: "Smutek" },
  { key: "thanks", Icon: HeartHandshake, title: "Děkuju" },
];

type Channel = "nastenka" | "chat" | "qa" | "poll" | "feedback";
type Post = {
  id: string;
  author_id: string;
  author_name: string | null;
  author_role: string | null;
  body: string;
  title: string | null;
  rating: number | null;
  pinned: boolean;
  channel: string;
  image_url: string | null;
  created_at: string;
};
type PollOption = { id: string; post_id: string; label: string; position: number };
type PollAgg = { counts: Record<string, number>; total: number; mine: string | null };
type Comment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  author_name: string | null;
  author_role: string | null;
  body: string;
  image_url: string | null;
  created_at: string;
};
type ReactionAgg = { counts: Record<string, number>; mine: Set<string> };

function nameOf(n: string | null): string {
  return n?.trim() || "Člen";
}
function initialOf(n: string | null): string {
  return (nameOf(n)[0] ?? "Č").toUpperCase();
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

  const [channel, setChannel] = useState<Channel>("nastenka");
  const [nastenkaSeen, setNastenkaSeen] = useState<number>(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [reactions, setReactions] = useState<Record<string, ReactionAgg>>({});
  const [pollOpts, setPollOpts] = useState<Record<string, PollOption[]>>({});
  const [pollVotes, setPollVotes] = useState<Record<string, PollAgg>>({});

  // Composer ankety (jen admin)
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollChoices, setPollChoices] = useState<string[]>(["", ""]);
  // Composer feedbacku
  const [fbTitle, setFbTitle] = useState("");
  const [fbDesc, setFbDesc] = useState("");
  const [fbRating, setFbRating] = useState(0);
  const [fbHover, setFbHover] = useState(0);

  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<Record<string, File | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(0);

  const uidRef = useRef<string | null>(null);
  const [pins, setPins] = useState<Record<string, string[]>>({});

  // Kolik VIP+ je právě online (na /klub se dostanou jen VIP+)
  useEffect(() => {
    if (phase !== "ready" || !userId) return;
    const ch = supabase.channel("klub-presence", { config: { presence: { key: userId } } });
    ch.on("presence", { event: "sync" }, () => setOnline(Object.keys(ch.presenceState()).length))
      .subscribe(async (s) => { if (s === "SUBSCRIBED") await ch.track({ at: Date.now() }); });
    return () => { supabase.removeChannel(ch); };
  }, [phase, userId, supabase]);

  const loadAll = useCallback(async () => {
    const uid = uidRef.current;
    const [p, c, r, po, pv] = await Promise.all([
      supabase
        .from("community_posts")
        .select("id, author_id, author_name, author_role, body, title, rating, pinned, channel, image_url, created_at")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("community_comments")
        .select("id, post_id, parent_id, author_id, author_name, author_role, body, image_url, created_at")
        .order("created_at", { ascending: true }),
      supabase.from("community_reactions").select("post_id, user_id, emoji"),
      supabase.from("community_poll_options").select("id, post_id, label, position").order("position", { ascending: true }),
      supabase.from("community_poll_votes").select("post_id, option_id, user_id"),
    ]);

    if (p.data) setPosts(p.data as unknown as Post[]);

    if (po.data) {
      const map: Record<string, PollOption[]> = {};
      for (const o of po.data as unknown as PollOption[]) {
        (map[o.post_id] ??= []).push(o);
      }
      setPollOpts(map);
    }
    if (pv.data) {
      const map: Record<string, PollAgg> = {};
      for (const row of pv.data as { post_id: string; option_id: string; user_id: string }[]) {
        const agg = (map[row.post_id] ??= { counts: {}, total: 0, mine: null });
        agg.counts[row.option_id] = (agg.counts[row.option_id] ?? 0) + 1;
        agg.total += 1;
        if (row.user_id === uid) agg.mine = row.option_id;
      }
      setPollVotes(map);
    }
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
    // přišpendlené odznaky autorů (posty + komentáře)
    const ids = new Set<string>();
    for (const x of (p.data ?? []) as unknown as Post[]) ids.add(x.author_id);
    for (const x of (c.data ?? []) as unknown as Comment[]) ids.add(x.author_id);
    if (ids.size) {
      const { data: pinData } = await supabase.rpc("pinned_for", { p_ids: Array.from(ids) });
      const pmap: Record<string, string[]> = {};
      for (const rr of (pinData ?? []) as { id: string; pinned_badges: string[] }[]) pmap[rr.id] = rr.pinned_badges ?? [];
      setPins(pmap);
    }
  }, [supabase]);

  useEffect(() => {
    let channelSub: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        // Ukázkový režim: demo VIP+ uvidí Klub (obsah je prázdný, jen náhled).
        if (PREVIEW_MODE && getDemoTierClient() === "VIP_PLUS") {
          setPhase("ready");
          await loadAll();
        } else {
          setPhase("anon");
        }
        return;
      }

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

      channelSub = supabase
        .channel("klub")
        .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () => loadAll())
        .on("postgres_changes", { event: "*", schema: "public", table: "community_comments" }, () => loadAll())
        .on("postgres_changes", { event: "*", schema: "public", table: "community_reactions" }, () => loadAll())
        .on("postgres_changes", { event: "*", schema: "public", table: "community_poll_votes" }, () => loadAll())
        .on("postgres_changes", { event: "*", schema: "public", table: "community_poll_options" }, () => loadAll())
        .subscribe();
    })();
    return () => { if (channelSub) supabase.removeChannel(channelSub); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Ťuplík" na Nástěnce – načtení poslední návštěvy + označení za přečtené
  useEffect(() => {
    if (typeof window === "undefined") return;
    setNastenkaSeen(Number(localStorage.getItem("klub_nastenka_seen") || 0));
  }, []);

  useEffect(() => {
    if (channel !== "nastenka" || typeof window === "undefined") return;
    const latest = posts
      .filter((p) => (p.channel ?? "chat") === "nastenka")
      .reduce((max, p) => Math.max(max, new Date(p.created_at).getTime()), 0);
    if (latest > 0) {
      localStorage.setItem("klub_nastenka_seen", String(latest));
      setNastenkaSeen(latest);
    }
  }, [channel, posts]);

  // Nahraje obrázek do úložiště a vrátí veřejnou URL (nebo null při chybě).
  async function uploadImage(key: string): Promise<string | null | "error"> {
    const file = pendingImage[key];
    if (!file || !userId) return null;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("community").upload(path, file);
    if (upErr) {
      setError("Obrázek se nepodařilo nahrát (" + upErr.message + "). Spustil jsi community_v4.sql?");
      return "error";
    }
    return supabase.storage.from("community").getPublicUrl(path).data.publicUrl;
  }

  async function addPost() {
    if ((!draft.trim() && !pendingImage["topic"]) || !userId) return;
    setPosting(true);
    setError(null);
    const img = await uploadImage("topic");
    if (img === "error") { setPosting(false); return; }
    const { error: err } = await supabase
      .from("community_posts")
      .insert({ author_id: userId, body: draft.trim(), channel, image_url: img });
    setPosting(false);
    if (err) {
      if (err.message.includes("TOPIC_LIMIT")) {
        setError("Tento týden jsi využil limit 2 topicy. Další můžeš založit příští týden. 🙂");
      } else {
        setError("Nepodařilo se uložit (" + err.message + ").");
      }
      return;
    }
    setDraft("");
    setPendingImage((p) => ({ ...p, topic: null }));
    loadAll();
  }
  async function addReply(postId: string, parentId: string) {
    const text = (replyDraft[parentId] ?? "").trim();
    const key = `rep:${parentId}`;
    if ((!text && !pendingImage[key]) || !userId) return;
    setError(null);
    const img = await uploadImage(key);
    if (img === "error") return;
    const { error: err } = await supabase
      .from("community_comments")
      .insert({ post_id: postId, author_id: userId, body: text, parent_id: parentId, image_url: img });
    if (err) {
      setError("Odpověď se nepodařilo uložit (" + err.message + ").");
      return;
    }
    setReplyDraft((d) => ({ ...d, [parentId]: "" }));
    setPendingImage((p) => ({ ...p, [key]: null }));
    setReplyOpen(null);
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
    const key = `cmt:${postId}`;
    if ((!text && !pendingImage[key]) || !userId) return;
    setError(null);
    const img = await uploadImage(key);
    if (img === "error") return;
    const { error: err } = await supabase
      .from("community_comments")
      .insert({ post_id: postId, author_id: userId, body: text, image_url: img });
    if (err) {
      setError("Komentář se nepodařilo uložit (" + err.message + ").");
      return;
    }
    setCommentDraft((d) => ({ ...d, [postId]: "" }));
    setPendingImage((p) => ({ ...p, [key]: null }));
    loadAll();
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

  // Tlačítko přílohy obrázku / náhled vybraného obrázku (klíč = kontext composeru).
  const attach = (key: string) => {
    const file = pendingImage[key];
    if (file) {
      return (
        <div className="inline-flex items-center gap-2 rounded-lg bg-brand-light px-2 py-1 text-xs text-brand-dark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={URL.createObjectURL(file)} alt="" className="h-8 w-8 rounded object-cover" />
          <span className="max-w-[120px] truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => setPendingImage((p) => ({ ...p, [key]: null }))}
            className="text-gray-400 hover:text-red-600"
            aria-label="Odebrat obrázek"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      );
    }
    return (
      <label className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-gray-400 hover:text-brand-blue">
        <ImagePlus className="h-4 w-4" strokeWidth={2} /> Obrázek
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPendingImage((p) => ({ ...p, [key]: f }));
            e.target.value = "";
          }}
        />
      </label>
    );
  };

  // Vykreslení jedné „bubliny" komentáře (vše zarovnané vlevo).
  const renderBubble = (c: Comment) => {
    const cHonza = c.author_role === "lektor";
    const mine = c.author_id === userId;
    return (
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${
          cHonza ? "bg-brand-dark" : mine ? "bg-brand-blue" : "bg-amber-500"
        }`}>
          {initialOf(c.author_name)}
        </span>
        <div className={`min-w-0 flex-1 rounded-xl px-3 py-2 ${
          cHonza ? "bg-brand-dark text-white" : mine ? "bg-brand-light" : "bg-gray-50"
        }`}>
          <p className={`text-xs font-semibold flex items-center gap-1.5 ${cHonza ? "text-white/90" : "text-brand-dark"}`}>
            <Link href={`/profil/${c.author_id}`} className="hover:underline">{nameOf(c.author_name)}</Link>
            <BadgePins ids={pins[c.author_id]} />
            {cHonza ? (
              <FounderBadge />
            ) : mine ? (
              <span className="rounded-full bg-brand-blue/10 px-1.5 text-[9px] font-bold text-brand-blue">TY</span>
            ) : null}
            <span className={`font-normal ${cHonza ? "text-white/60" : "text-gray-400"}`}>· {timeAgo(c.created_at)}</span>
          </p>
          {c.body && <p className={`text-sm whitespace-pre-wrap ${cHonza ? "text-white" : "text-brand-dark"}`}>{c.body}</p>}
          {c.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.image_url} alt="" className="mt-2 max-h-72 rounded-lg object-cover" />
          )}
        </div>
        {(isAdmin || mine) && (
          <button
            type="button"
            onClick={() => deleteComment(c.id)}
            className="mt-1 p-1 text-gray-300 hover:text-red-600"
            title="Smazat"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </div>
    );
  };

  // ── Ankety ────────────────────────────────────────────────────────────────
  async function createPoll() {
    if (!userId) return;
    const q = pollQuestion.trim();
    const choices = pollChoices.map((c) => c.trim()).filter(Boolean);
    if (!q || choices.length < 2) {
      setError("Anketa potřebuje otázku a aspoň 2 možnosti.");
      return;
    }
    setError(null);
    const { data: post, error: err } = await supabase
      .from("community_posts")
      .insert({ author_id: userId, body: q, channel: "poll" })
      .select("id")
      .single();
    if (err || !post) {
      setError("Anketu se nepodařilo vytvořit (" + (err?.message ?? "") + ").");
      return;
    }
    const rows = choices.map((label, i) => ({ post_id: post.id, label, position: i }));
    const { error: optErr } = await supabase.from("community_poll_options").insert(rows);
    if (optErr) {
      setError("Možnosti ankety se nepodařilo uložit (" + optErr.message + "). Spustil jsi community_v5.sql?");
      return;
    }
    setPollQuestion("");
    setPollChoices(["", ""]);
    loadAll();
  }
  async function vote(postId: string, optionId: string) {
    if (!userId) return;
    setError(null);
    const { error: err } = await supabase
      .from("community_poll_votes")
      .upsert({ post_id: postId, option_id: optionId, user_id: userId }, { onConflict: "post_id,user_id" });
    if (err) {
      setError("Hlas se nepodařilo uložit (" + err.message + ").");
      return;
    }
    loadAll();
  }

  // ── Feedback ────────────────────────────────────────────────────────────────
  async function createFeedback() {
    if (!userId) return;
    if (!fbTitle.trim() || fbRating < 1) {
      setError("Vyplň název a vyber hodnocení (1–5 hvězd).");
      return;
    }
    setError(null);
    const img = await uploadImage("feedback");
    if (img === "error") return;
    const { error: err } = await supabase.from("community_posts").insert({
      author_id: userId,
      channel: "feedback",
      title: fbTitle.trim(),
      body: fbDesc.trim(),
      rating: fbRating,
      image_url: img,
    });
    if (err) {
      setError("Feedback se nepodařilo odeslat (" + err.message + ").");
      return;
    }
    setFbTitle("");
    setFbDesc("");
    setFbRating(0);
    setPendingImage((p) => ({ ...p, feedback: null }));
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
  const visiblePosts = posts.filter((p) => (p.channel ?? "chat") === channel);
  const isQa = channel === "qa";

  // Spam kontrola: člen smí v chatu založit max 2 topicy za 7 dní (admin neomezen).
  const myChatThisWeek = posts.filter(
    (p) =>
      p.author_id === userId &&
      (p.channel ?? "chat") === "chat" &&
      Date.now() - new Date(p.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length;
  const topicsLeft = Math.max(0, 2 - myChatThisWeek);
  const chatLimitReached = !isAdmin && channel === "chat" && topicsLeft <= 0;

  // "Ťuplík" na Nástěnce – signalizuje nový vzkaz od lektora
  const nastenkaLatest = posts
    .filter((p) => (p.channel ?? "chat") === "nastenka")
    .reduce((max, p) => Math.max(max, new Date(p.created_at).getTime()), 0);
  const nastenkaUnread = nastenkaLatest > 0 && nastenkaLatest > nastenkaSeen;

  return (
    <div className="min-h-screen bg-brand-light py-10">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* Hlavička */}
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-white shadow-sm">
            <Crown className="h-6 w-6" strokeWidth={2} />
          </span>
          <h1 className="text-2xl font-semibold text-brand-dark">VIP+ Klub</h1>
        </div>

        {/* Uvítací banner */}
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 p-5 text-white shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-semibold">Vítej! Užij si všechny výhody VIP+ 👑</p>
              <p className="text-sm text-white/85">Tvoje prémiové zázemí na jednom místě.</p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
              {online} online
            </span>
          </div>
        </div>

        {/* Rozcestník VIP+ funkcí */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { href: "/klub/mixer", label: "Mixér", Icon: Wand2, desc: "Sestav si lekci" },
            { href: "/klub/live", label: "LIVE", Icon: Radio, desc: "Streamy + záznam" },
            { href: "/klub/kalkulacka", label: "Kalorie", Icon: Calculator, desc: "Kalkulačka jídla" },
            { href: "/kruhy", label: "Kruhy", Icon: Users, desc: "Komunita" },
            { href: "/videoknihovna", label: "VIP+ videa", Icon: Film, desc: "Exkluzivní obsah" },
          ].map(({ href, label, Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="card card-3d p-4 flex flex-col items-center justify-center gap-1.5 text-center"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-white shadow-sm">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="text-sm font-semibold text-brand-dark">{label}</span>
              <span className="text-[11px] text-gray-400">{desc}</span>
            </Link>
          ))}
        </div>

        {/* Komunitní zeď */}
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Komunita</p>

        {/* Záložky */}
        <div className="mb-5 flex gap-1 rounded-xl bg-white p-1 shadow-sm">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setChannel(key)}
              className={`relative flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs sm:text-sm font-semibold transition-colors ${
                channel === key ? "bg-brand-blue text-white" : "text-gray-500 hover:text-brand-dark"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="hidden sm:inline">{label}</span>
              {key === "nastenka" && nastenkaUnread && (
                <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Composer – podle kanálu */}
        {channel === "poll" ? (
          isAdmin ? (
            <div className="card p-4 mb-6 space-y-3">
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Otázka ankety…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
              {pollChoices.map((choice, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={choice}
                    onChange={(e) =>
                      setPollChoices((arr) => arr.map((c, idx) => (idx === i ? e.target.value : c)))
                    }
                    placeholder={`Možnost ${i + 1}`}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                  {pollChoices.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPollChoices((arr) => arr.filter((_, idx) => idx !== i))}
                      className="p-1 text-gray-300 hover:text-red-600"
                      aria-label="Odebrat možnost"
                    >
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPollChoices((arr) => [...arr, ""])}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Přidat možnost
                </button>
                <button type="button" onClick={createPoll} className="btn-primary text-sm">
                  Vytvořit anketu
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-4 mb-6 text-center text-sm text-gray-500">
              Ankety vytváří lektor. Můžeš hlasovat a diskutovat u jednotlivých anket níže. 🙂
            </div>
          )
        ) : channel === "feedback" ? (
          <div className="card p-4 mb-6 space-y-3">
            <input
              type="text"
              value={fbTitle}
              onChange={(e) => setFbTitle(e.target.value)}
              placeholder="Název – čeho se to týká?"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            <textarea
              value={fbDesc}
              onChange={(e) => setFbDesc(e.target.value)}
              rows={3}
              placeholder="Popis – co tě trápí, nebo za co chválíš…"
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            <div className="flex items-center gap-1" onMouseLeave={() => setFbHover(0)}>
              <span className="text-sm text-gray-500 mr-1">Hodnocení:</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFbRating(n)}
                  onMouseEnter={() => setFbHover(n)}
                  aria-label={`${n} z 5`}
                  className="p-0.5"
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      n <= (fbHover || fbRating) ? "fill-amber-400 text-amber-400" : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              {attach("feedback")}
              <button type="button" onClick={createFeedback} className="btn-primary text-sm">
                Odeslat feedback
              </button>
            </div>
          </div>
        ) : channel === "nastenka" ? (
          isAdmin ? (
            <div className="card p-4 mb-6">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder="Napiš vzkaz, citát nebo myšlenku dne… (můžeš přidat i fotku)"
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                {attach("topic")}
                <button
                  type="button"
                  onClick={addPost}
                  disabled={posting || (!draft.trim() && !pendingImage["topic"])}
                  className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <Megaphone className="h-4 w-4" strokeWidth={2} />
                  {posting ? "Vyvěšuji…" : "Vyvěsit na nástěnku"}
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-4 mb-6 flex items-center gap-3 text-sm text-gray-500">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Megaphone className="h-4 w-4" strokeWidth={2} />
              </span>
              <span>Sem píše vzkazy, citáty a osobní zprávy lektor. Můžeš reagovat a komentovat níže. 🙂</span>
            </div>
          )
        ) : chatLimitReached ? (
          <div className="card p-4 mb-6 text-center text-sm text-gray-500">
            Tento týden jsi založil <strong>2 topicy</strong> (limit kvůli přehlednosti).
            Další můžeš založit příští týden — do diskuze pod stávající topicy můžeš psát dál. 🙂
          </div>
        ) : (
          <div className="card p-4 mb-6">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder={
                isQa
                  ? "Na co se chceš zeptat? Lektor ti odpoví…"
                  : isAdmin
                    ? "Napiš oznámení nebo nový topic…"
                    : "Založ nový topic k diskuzi…"
              }
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {attach("topic")}
                {channel === "chat" && !isAdmin && (
                  <span className="text-xs text-gray-400">
                    Zbývají ti {topicsLeft} {topicsLeft === 1 ? "topic" : "topicy"} (limit 2/týden).
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={addPost}
                disabled={posting || (!draft.trim() && !pendingImage["topic"])}
                className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <Send className="h-4 w-4" strokeWidth={2} />
                {posting ? "Odesílám…" : "Založit topic"}
              </button>
            </div>
          </div>
        )}

        {/* Feed */}
        {visiblePosts.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            {(() => {
              const Icon = TABS.find((t) => t.key === channel)?.Icon ?? MessageCircle;
              return <Icon className="mx-auto mb-2 h-8 w-8" strokeWidth={1.5} />;
            })()}
            <p className="text-sm">
              {channel === "nastenka"
                ? "Na nástěnce zatím nic nevisí. Brzy sem Honza něco napíše. 😉"
                : channel === "qa"
                  ? "Zatím žádné otázky. Zeptej se jako první!"
                  : channel === "poll"
                    ? "Zatím žádné ankety."
                    : channel === "feedback"
                      ? "Zatím žádný feedback. Napiš první!"
                      : "Zatím tu nic není. Buď první, kdo napíše!"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visiblePosts.map((post) => {
              const rx = reactions[post.id];
              const postComments = comments[post.id] ?? [];
              const honza = post.author_role === "lektor";
              const canComment = (post.channel ?? "chat") !== "qa" || isAdmin;
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
                      {initialOf(post.author_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-dark flex items-center gap-1.5">
                        <Link href={`/profil/${post.author_id}`} className="hover:underline">{nameOf(post.author_name)}</Link>
                        <BadgePins ids={pins[post.author_id]} />
                        {honza ? (
                          <FounderBadge />
                        ) : (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">VIP+</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
                    </div>
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

                  {/* Tělo – podle typu */}
                  {post.channel === "poll" ? (
                    <div className="mt-3">
                      <p className="mb-3 text-sm font-semibold text-brand-dark">{post.body}</p>
                      <div className="space-y-2">
                        {(pollOpts[post.id] ?? []).map((o) => {
                          const agg = pollVotes[post.id] ?? { counts: {}, total: 0, mine: null };
                          const cnt = agg.counts[o.id] ?? 0;
                          const pct = agg.total ? Math.round((cnt / agg.total) * 100) : 0;
                          const mineOpt = agg.mine === o.id;
                          return (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => vote(post.id, o.id)}
                              className={`relative block w-full overflow-hidden rounded-lg border text-left transition-colors ${
                                mineOpt ? "border-brand-blue" : "border-gray-200 hover:border-brand-blue"
                              }`}
                            >
                              <div className="absolute inset-y-0 left-0 bg-brand-light" style={{ width: `${pct}%` }} />
                              <div className="relative flex items-center justify-between px-3 py-2 text-sm">
                                <span className="flex items-center gap-2 font-medium text-brand-dark">
                                  {mineOpt && <Check className="h-4 w-4 text-brand-blue" strokeWidth={3} />}
                                  {o.label}
                                </span>
                                <span className="font-semibold text-gray-500">{pct} %</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        {(pollVotes[post.id]?.total ?? 0)} {(pollVotes[post.id]?.total ?? 0) === 1 ? "hlas" : "hlasů"}
                        {!pollVotes[post.id]?.mine && " · klikni pro hlasování"}
                      </p>
                    </div>
                  ) : post.channel === "feedback" ? (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-4 w-4 ${n <= (post.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                          />
                        ))}
                      </div>
                      {post.title && <h3 className="font-semibold text-brand-dark">{post.title}</h3>}
                      {post.body && (
                        <p className="mt-1 text-sm text-brand-dark leading-relaxed whitespace-pre-wrap">{post.body}</p>
                      )}
                      {post.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.image_url} alt="" className="mt-3 max-h-96 w-full rounded-lg object-cover" />
                      )}
                    </div>
                  ) : (
                    <>
                      {post.body && (
                        <p className="mt-3 text-sm text-brand-dark leading-relaxed whitespace-pre-wrap">{post.body}</p>
                      )}
                      {post.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.image_url} alt="" className="mt-3 max-h-96 w-full rounded-lg object-cover" />
                      )}
                    </>
                  )}

                  {/* Reakce */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {REACTIONS.map(({ key, Icon, title }) => {
                      const count = rx?.counts[key] ?? 0;
                      const mine = rx?.mine?.has(key) ?? false;
                      return (
                        <button
                          key={key}
                          type="button"
                          title={title}
                          onClick={() => toggleReaction(post.id, key)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                            mine
                              ? "border-brand-blue bg-brand-light text-brand-blue font-semibold"
                              : "border-gray-200 text-gray-400 hover:border-brand-blue hover:text-brand-blue"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                          {count > 0 && <span>{count}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Komentáře / odpovědi (vlákna) */}
                  {(() => {
                    const all = postComments;
                    const tops = all.filter((c) => !c.parent_id);
                    if (tops.length === 0) return null;
                    return (
                      <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                        {tops.map((c) => {
                          const replies = all.filter((r) => r.parent_id === c.id);
                          return (
                            <div key={c.id}>
                              {renderBubble(c)}

                              {replies.length > 0 && (
                                <div className="mt-2 ml-9 space-y-2 border-l-2 border-gray-100 pl-3">
                                  {replies.map((r) => <div key={r.id}>{renderBubble(r)}</div>)}
                                </div>
                              )}

                              {/* Odpovědět (vnoří se pod komentář) */}
                              {canComment && (
                                replyOpen === c.id ? (
                                  <div className="mt-2 ml-9">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        autoFocus
                                        value={replyDraft[c.id] ?? ""}
                                        onChange={(e) => setReplyDraft((d) => ({ ...d, [c.id]: e.target.value }))}
                                        onKeyDown={(e) => { if (e.key === "Enter") addReply(post.id, c.id); }}
                                        placeholder="Odpověz na komentář…"
                                        className="flex-1 rounded-full border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => addReply(post.id, c.id)}
                                        disabled={!(replyDraft[c.id] ?? "").trim() && !pendingImage[`rep:${c.id}`]}
                                        className="shrink-0 rounded-full bg-brand-blue p-2 text-white disabled:opacity-30"
                                        aria-label="Odeslat odpověď"
                                      >
                                        <Send className="h-4 w-4" strokeWidth={2} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setReplyOpen(null)}
                                        className="shrink-0 text-xs text-gray-400 hover:text-brand-dark"
                                      >
                                        Zrušit
                                      </button>
                                    </div>
                                    <div className="mt-1.5">{attach(`rep:${c.id}`)}</div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setReplyOpen(c.id)}
                                    className="mt-1 ml-9 inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-brand-blue"
                                  >
                                    <CornerDownRight className="h-3 w-3" strokeWidth={2} /> Odpovědět
                                  </button>
                                )
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Přidat komentář / odpověď */}
                  {canComment ? (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={commentDraft[post.id] ?? ""}
                          onChange={(e) => setCommentDraft((d) => ({ ...d, [post.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") addComment(post.id); }}
                          placeholder={isQa ? "Napiš odpověď…" : "Napiš komentář…"}
                          className="flex-1 rounded-full border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                        />
                        <button
                          type="button"
                          onClick={() => addComment(post.id)}
                          disabled={!(commentDraft[post.id] ?? "").trim() && !pendingImage[`cmt:${post.id}`]}
                          className="shrink-0 rounded-full bg-brand-blue p-2 text-white disabled:opacity-30"
                          aria-label="Odeslat"
                        >
                          <Send className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </div>
                      <div className="mt-1.5">{attach(`cmt:${post.id}`)}</div>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs italic text-gray-400">Na otázky odpovídá lektor.</p>
                  )}
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
