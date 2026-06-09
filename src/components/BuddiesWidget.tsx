"use client";

import { useEffect, useRef, useState } from "react";
import { Users, X, Send, Check, UserPlus, MessageSquare, ArrowLeft, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { normalizeTier } from "@/lib/tiers";

type Buddy = { friendship_id: string; friend_id: string; name: string; status: string; direction: string };
type Msg = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };

export function BuddiesWidget() {
  const supabase = createClient();
  const [allowed, setAllowed] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState<string | null>(null);

  const [chat, setChat] = useState<{ id: string; name: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [msgBody, setMsgBody] = useState("");

  const chatIdRef = useRef<string | null>(null);
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
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("tier").eq("id", user.id).maybeSingle();
      const ok = normalizeTier(p?.tier as string | undefined) !== "FREE" || isAdminEmail(user.email);
      if (!ok) return;
      setUid(user.id);
      uidRef.current = user.id;
      setAllowed(true);
      loadBuddies();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel("dmw-" + uid)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Msg;
        const me = uidRef.current;
        const openId = chatIdRef.current;
        if (openId && ((m.sender_id === openId && m.recipient_id === me) || (m.sender_id === me && m.recipient_id === openId))) {
          setMessages((arr) => (arr.some((x) => x.id === m.id) ? arr : [...arr, m]));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chat]);

  async function addBuddy() {
    setInfo(null);
    const e = email.trim();
    if (!e) return;
    const { data: found } = await supabase.rpc("find_user_by_email", { p_email: e });
    const u = (found ?? [])[0] as { id: string; name: string } | undefined;
    if (!u) { setInfo("Nikdo takový tu není (musí být registrovaný)."); return; }
    const { data: res } = await supabase.rpc("send_buddy_request", { p_to: u.id });
    setInfo(res === "ok" ? `Žádost odeslána: ${u.name} 👍` : res === "exists" ? "Už jste propojení / žádost běží." : "Tohle nejde.");
    setEmail("");
    loadBuddies();
  }
  async function accept(id: string) { await supabase.from("friendships").update({ status: "accepted" }).eq("id", id); loadBuddies(); }
  async function removeFr(id: string, friendId?: string) {
    await supabase.from("friendships").delete().eq("id", id);
    if (friendId && chat?.id === friendId) { setChat(null); chatIdRef.current = null; }
    loadBuddies();
  }
  async function openChat(b: Buddy) {
    setChat({ id: b.friend_id, name: b.name });
    chatIdRef.current = b.friend_id;
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, body, created_at")
      .or(`and(sender_id.eq.${uid},recipient_id.eq.${b.friend_id}),and(sender_id.eq.${b.friend_id},recipient_id.eq.${uid})`)
      .order("created_at");
    setMessages((data ?? []) as Msg[]);
  }
  async function sendMessage() {
    if (!uid || !chat || !msgBody.trim()) return;
    const body = msgBody.trim();
    setMsgBody("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: uid, recipient_id: chat.id, body })
      .select("id, sender_id, recipient_id, body, created_at")
      .single();
    if (!error && data) setMessages((arr) => (arr.some((x) => x.id === (data as Msg).id) ? arr : [...arr, data as Msg]));
  }

  if (!allowed) return null;

  const accepted = buddies.filter((b) => b.status === "accepted");
  const incoming = buddies.filter((b) => b.status === "pending" && b.direction === "in");

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Parťáci"
          className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue text-white shadow-xl ring-1 ring-black/5 transition-transform hover:scale-105"
        >
          <Users className="h-6 w-6" />
          {incoming.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">{incoming.length}</span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
          {/* Hlavička */}
          <div className="flex items-center gap-2 bg-brand-dark px-4 py-3 text-white">
            {chat ? (
              <button onClick={() => { setChat(null); chatIdRef.current = null; }} aria-label="Zpět" className="text-white/80 hover:text-white"><ArrowLeft className="h-5 w-5" /></button>
            ) : (
              <Users className="h-5 w-5" />
            )}
            <p className="flex-1 text-sm font-semibold">{chat ? chat.name : "Parťáci"}</p>
            <button onClick={() => setOpen(false)} aria-label="Zavřít" className="text-white/80 hover:text-white"><X className="h-5 w-5" /></button>
          </div>

          {chat ? (
            /* CHAT */
            <>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-brand-light/40 p-3">
                {messages.length === 0 ? (
                  <p className="text-center text-xs text-gray-400">Napiš první zprávu. 👋</p>
                ) : messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === uid ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${m.sender_id === uid ? "bg-brand-blue text-white rounded-br-sm" : "bg-white text-brand-dark ring-1 ring-gray-200 rounded-bl-sm"}`}>{m.body}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 border-t border-gray-100 p-2">
                <input value={msgBody} onChange={(e) => setMsgBody(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }} placeholder="Zpráva…" className="flex-1 rounded-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                <button onClick={sendMessage} disabled={!msgBody.trim()} className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue text-white disabled:opacity-50" aria-label="Odeslat"><Send className="h-4 w-4" /></button>
              </div>
            </>
          ) : (
            /* SEZNAM */
            <div className="flex-1 overflow-y-auto p-3">
              {/* Přidat */}
              <div className="mb-3 flex gap-2">
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="přidat podle e-mailu" className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                <button onClick={addBuddy} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-white" aria-label="Přidat"><UserPlus className="h-4 w-4" /></button>
              </div>
              {info && <p className="mb-3 text-xs text-gray-500">{info}</p>}

              {incoming.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">Žádosti</p>
                  {incoming.map((b) => (
                    <div key={b.friendship_id} className="flex items-center gap-2 py-1">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue text-[11px] font-semibold text-white">{(b.name[0] ?? "Č").toUpperCase()}</span>
                      <span className="flex-1 text-sm text-brand-dark">{b.name}</span>
                      <button onClick={() => accept(b.friendship_id)} className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={() => removeFr(b.friendship_id)} className="text-gray-300 hover:text-red-500"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}

              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">Parťáci ({accepted.length})</p>
              {accepted.length === 0 ? (
                <p className="text-xs text-gray-400">Zatím nikdo. Přidej si parťáka podle e-mailu výše. 🙂</p>
              ) : (
                <div className="space-y-1">
                  {accepted.map((b) => (
                    <div key={b.friendship_id} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-brand-light/50">
                      <button onClick={() => openChat(b)} className="flex flex-1 items-center gap-2 text-left">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-xs font-semibold text-white">{(b.name[0] ?? "Č").toUpperCase()}</span>
                        <span className="flex-1 text-sm font-medium text-brand-dark">{b.name}</span>
                        <MessageSquare className="h-4 w-4 text-brand-blue" />
                      </button>
                      <button onClick={() => removeFr(b.friendship_id, b.friend_id)} className="text-gray-300 hover:text-red-500" aria-label="Odebrat"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
