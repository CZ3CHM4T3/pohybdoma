"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserPlus, Lock, Send, Check, X, MessageSquare, ArrowLeft, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { normalizeTier } from "@/lib/tiers";

type Buddy = { friendship_id: string; friend_id: string; name: string; status: string; direction: string };
type Msg = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };

export default function BuddiesPage() {
  const supabase = createClient();
  const [phase, setPhase] = useState<"loading" | "anon" | "locked" | "ready">("loading");
  const [uid, setUid] = useState<string | null>(null);

  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState<string | null>(null);

  const [open, setOpen] = useState<{ id: string; name: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [msgBody, setMsgBody] = useState("");

  const openIdRef = useRef<string | null>(null);
  const uidRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadBuddies() {
    const { data } = await supabase.rpc("my_buddies");
    setBuddies((data ?? []) as Buddy[]);
  }

  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const user = au.user;
      if (!user) { setPhase("anon"); return; }
      const { data: p } = await supabase.from("profiles").select("tier").eq("id", user.id).maybeSingle();
      const ok = normalizeTier(p?.tier as string | undefined) !== "FREE" || isAdminEmail(user.email);
      if (!ok) { setPhase("locked"); return; }
      setUid(user.id);
      uidRef.current = user.id;
      await loadBuddies();
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime příchozí zprávy
  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel("dm-" + uid)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Msg;
        const me = uidRef.current;
        const openId = openIdRef.current;
        const inThisChat =
          openId &&
          ((m.sender_id === openId && m.recipient_id === me) || (m.sender_id === me && m.recipient_id === openId));
        if (inThisChat) {
          setMessages((arr) => (arr.some((x) => x.id === m.id) ? arr : [...arr, m]));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function addBuddy() {
    setInfo(null);
    const e = email.trim();
    if (!e) return;
    const { data: found } = await supabase.rpc("find_user_by_email", { p_email: e });
    const u = (found ?? [])[0] as { id: string; name: string } | undefined;
    if (!u) { setInfo("Nikdo takový tu není. Zkontroluj e-mail (musí být registrovaný)."); return; }
    const { data: res } = await supabase.rpc("send_buddy_request", { p_to: u.id });
    setInfo(res === "ok" ? `Žádost odeslána: ${u.name} 👍` : res === "exists" ? "S tímhle člověkem už jste propojení (nebo žádost běží)." : "Tohle nejde.");
    setEmail("");
    loadBuddies();
  }

  async function accept(id: string) {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
    loadBuddies();
  }
  async function removeFr(id: string, friendId?: string) {
    await supabase.from("friendships").delete().eq("id", id);
    if (friendId && open?.id === friendId) { setOpen(null); openIdRef.current = null; }
    loadBuddies();
  }

  async function openChat(b: Buddy) {
    setOpen({ id: b.friend_id, name: b.name });
    openIdRef.current = b.friend_id;
    const me = uid;
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, body, created_at")
      .or(`and(sender_id.eq.${me},recipient_id.eq.${b.friend_id}),and(sender_id.eq.${b.friend_id},recipient_id.eq.${me})`)
      .order("created_at");
    setMessages((data ?? []) as Msg[]);
  }

  async function sendMessage() {
    if (!uid || !open || !msgBody.trim()) return;
    const body = msgBody.trim();
    setMsgBody("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: uid, recipient_id: open.id, body })
      .select("id, sender_id, recipient_id, body, created_at")
      .single();
    if (!error && data) {
      setMessages((arr) => (arr.some((x) => x.id === (data as Msg).id) ? arr : [...arr, data as Msg]));
    }
  }

  if (phase === "loading") return <Centered><p className="text-gray-400">Načítám…</p></Centered>;
  if (phase === "anon") {
    return (
      <Centered>
        <UserPlus className="mx-auto mb-3 h-10 w-10 text-brand-blue" strokeWidth={1.8} />
        <h1 className="text-xl font-semibold text-brand-dark mb-2">Buddies</h1>
        <p className="text-sm text-gray-500 mb-5">Najdi si buddies na cvičení – přihlas se.</p>
        <Link href="/ucet" className="btn-primary">Přihlásit se</Link>
      </Centered>
    );
  }
  if (phase === "locked") {
    return (
      <Centered>
        <Lock className="mx-auto mb-3 h-10 w-10 text-brand-blue" strokeWidth={1.8} />
        <h1 className="text-xl font-semibold text-brand-dark mb-2">Buddies jsou pro členy</h1>
        <p className="text-sm text-gray-500 mb-5">Přidávání přátel a chat je od úrovně MEMBER.</p>
        <Link href="/clenstvi" className="btn-primary">Zobrazit členství</Link>
      </Centered>
    );
  }

  const accepted = buddies.filter((b) => b.status === "accepted");
  const incoming = buddies.filter((b) => b.status === "pending" && b.direction === "in");
  const outgoing = buddies.filter((b) => b.status === "pending" && b.direction === "out");

  // ── Otevřený chat ──
  if (open) {
    return (
      <div className="min-h-screen bg-brand-light py-10">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <button onClick={() => { setOpen(null); openIdRef.current = null; }} className="inline-flex items-center gap-2 text-sm text-brand-blue font-semibold mb-6 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Zpět na buddies
          </button>
          <div className="card flex h-[70vh] max-h-[600px] flex-col overflow-hidden">
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue text-sm font-semibold text-white">
                {(open.name?.[0] ?? "Č").toUpperCase()}
              </span>
              <p className="text-sm font-semibold text-brand-dark">{open.name}</p>
            </div>
            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-brand-light/40 p-4">
              {messages.length === 0 ? (
                <p className="text-center text-xs text-gray-400">Napiš první zprávu. 👋</p>
              ) : messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_id === uid ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === uid ? "bg-brand-blue text-white rounded-br-sm" : "bg-white text-brand-dark ring-1 ring-gray-200 rounded-bl-sm"}`}>
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-gray-100 p-2">
              <input
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                placeholder="Napiš zprávu…"
                className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
              <button onClick={sendMessage} disabled={!msgBody.trim()} className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue text-white disabled:opacity-50" aria-label="Odeslat">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Seznam parťáků ──
  return (
    <div className="min-h-screen bg-brand-light py-10">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand-blue">
            <UserPlus className="h-6 w-6" strokeWidth={2} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-brand-dark">Buddies</h1>
            <p className="text-sm text-gray-500">Přidej si buddies a pište si. Společně to jde líp! 💪</p>
          </div>
        </div>

        {/* Přidat */}
        <div className="card p-5 mb-6">
          <label className="block text-xs font-semibold text-brand-dark mb-1">Přidat buddyho podle e-mailu</label>
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@partaka.cz"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            <button onClick={addBuddy} className="btn-primary text-sm inline-flex items-center gap-2"><UserPlus className="h-4 w-4" /> Přidat</button>
          </div>
          {info && <p className="mt-2 text-xs text-gray-500">{info}</p>}
        </div>

        {/* Žádosti */}
        {incoming.length > 0 && (
          <div className="card p-5 mb-6">
            <h2 className="text-sm font-semibold text-brand-dark mb-3">Žádosti o přátelství</h2>
            <div className="space-y-2">
              {incoming.map((b) => (
                <div key={b.friendship_id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-xs font-semibold text-white">{(b.name[0] ?? "Č").toUpperCase()}</span>
                  <span className="flex-1 text-sm font-medium text-brand-dark">{b.name}</span>
                  <button onClick={() => accept(b.friendship_id)} className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Přijmout</button>
                  <button onClick={() => removeFr(b.friendship_id)} className="text-gray-300 hover:text-red-500" aria-label="Odmítnout"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buddies */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-brand-dark mb-3">Moji buddies ({accepted.length})</h2>
          {accepted.length === 0 ? (
            <p className="text-sm text-gray-400">Zatím nikdo. Přidej si buddyho podle e-mailu výše. 🙂</p>
          ) : (
            <div className="space-y-2">
              {accepted.map((b) => (
                <div key={b.friendship_id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-xs font-semibold text-white">{(b.name[0] ?? "Č").toUpperCase()}</span>
                  <span className="flex-1 text-sm font-medium text-brand-dark">{b.name}</span>
                  <button onClick={() => openChat(b)} className="rounded-lg bg-brand-blue px-3 py-1 text-xs font-semibold text-white inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Chat</button>
                  <button onClick={() => removeFr(b.friendship_id, b.friend_id)} className="text-gray-300 hover:text-red-500" aria-label="Odebrat"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}

          {outgoing.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-400 mb-2">Odeslané žádosti</p>
              {outgoing.map((b) => (
                <div key={b.friendship_id} className="flex items-center gap-3 py-1 text-sm text-gray-500">
                  <span className="flex-1">{b.name} <span className="text-xs text-gray-400">· čeká</span></span>
                  <button onClick={() => removeFr(b.friendship_id)} className="text-xs font-semibold text-gray-400 hover:text-red-600">Zrušit</button>
                </div>
              ))}
            </div>
          )}
        </div>
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
