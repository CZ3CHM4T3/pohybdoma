"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Users, X, Send, Check, UserPlus, MessageSquare, ArrowLeft, Trash2, Smile, ImagePlus, Ban, Search } from "lucide-react";
import { BadgePins } from "@/components/BadgePins";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { normalizeTier } from "@/lib/tiers";

type Buddy = { friendship_id: string; friend_id: string; name: string; status: string; direction: string };
type Msg = { id: string; sender_id: string; recipient_id: string; body: string; image_url: string | null; created_at: string };

const EMOJIS = ["😀", "😂", "❤️", "👍", "💪", "🎉", "🙌", "🔥", "😅", "🙏"];
const MSG_COLS = "id, sender_id, recipient_id, body, image_url, created_at";

export function BuddiesWidget() {
  const supabase = createClient();
  const [allowed, setAllowed] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [pins, setPins] = useState<Record<string, string[]>>({});
  const [listQuery, setListQuery] = useState("");
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState<string | null>(null);

  const [chat, setChat] = useState<{ id: string; name: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [msgBody, setMsgBody] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [typingFrom, setTypingFrom] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const chatIdRef = useRef<string | null>(null);
  const uidRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSent = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  function beep() {
    try {
      const Ctx = window.AudioContext;
      if (!Ctx) return;
      const ctx = audioRef.current ?? (audioRef.current = new Ctx());
      if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; g.gain.value = 0.05;
      o.start(); o.stop(ctx.currentTime + 0.12);
    } catch {}
  }

  async function loadBuddies() {
    const { data } = await supabase.rpc("my_buddies");
    const list = (data ?? []) as Buddy[];
    setBuddies(list);
    const ids = list.filter((b) => b.status === "accepted").map((b) => b.friend_id);
    if (ids.length) {
      const { data: pd } = await supabase.rpc("pinned_for", { p_ids: ids });
      const m: Record<string, string[]> = {};
      for (const r of (pd ?? []) as { id: string; pinned_badges: string[] }[]) m[r.id] = r.pinned_badges ?? [];
      setPins(m);
    }
  }
  async function loadUnread() {
    const { data } = await supabase.rpc("unread_by_buddy");
    const map: Record<string, number> = {};
    for (const r of (data ?? []) as { friend_id: string; cnt: number }[]) map[r.friend_id] = r.cnt;
    setUnread(map);
  }
  async function markRead(friendId: string) {
    setUnread((u) => { const n = { ...u }; delete n[friendId]; return n; });
    await supabase.rpc("mark_dm_read", { p_friend: friendId });
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
      loadUnread();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Příchozí zprávy + nepřečtené + zvuk
  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel("dmw-" + uid)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Msg;
        const me = uidRef.current;
        const openId = chatIdRef.current;
        const inOpen = openId && ((m.sender_id === openId && m.recipient_id === me) || (m.sender_id === me && m.recipient_id === openId));
        if (inOpen) {
          setMessages((arr) => (arr.some((x) => x.id === m.id) ? arr : [...arr, m]));
          if (m.sender_id !== me) markRead(openId!);
        } else if (m.recipient_id === me && m.sender_id !== me) {
          setUnread((u) => ({ ...u, [m.sender_id]: (u[m.sender_id] ?? 0) + 1 }));
          beep();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Online stav (Presence)
  useEffect(() => {
    if (!uid) return;
    const ch = supabase.channel("online-users", { config: { presence: { key: uid } } });
    ch.on("presence", { event: "sync" }, () => {
      setOnlineIds(new Set(Object.keys(ch.presenceState())));
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ at: Date.now() });
    });
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // „píše…" (broadcast)
  useEffect(() => {
    if (!uid) return;
    const ch = supabase.channel("buddy-typing");
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      const p = payload as { from: string; to: string };
      if (p.to === uidRef.current) {
        setTypingFrom(p.from);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTypingFrom(null), 3000);
      }
    }).subscribe();
    typingChRef.current = ch;
    return () => { supabase.removeChannel(ch); typingChRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chat, typingFrom]);

  function onType(v: string) {
    setMsgBody(v);
    const now = Date.now();
    if (chat && typingChRef.current && now - lastTypingSent.current > 1500) {
      lastTypingSent.current = now;
      typingChRef.current.send({ type: "broadcast", event: "typing", payload: { from: uid, to: chat.id } });
    }
  }

  async function addBuddy() {
    setInfo(null);
    const e = email.trim();
    if (!e) return;
    const { data: found } = await supabase.rpc("find_user_by_email", { p_email: e });
    const u = (found ?? [])[0] as { id: string; name: string } | undefined;
    if (!u) { setInfo("Nikdo takový tu není (musí být registrovaný)."); return; }
    const { data: res } = await supabase.rpc("send_buddy_request", { p_to: u.id });
    setInfo(res === "ok" ? `Žádost odeslána: ${u.name} 👍` : res === "exists" ? "Už jste propojení / žádost běží." : res === "blocked" ? "S tímto člověkem to nejde (blokace)." : "Tohle nejde.");
    setEmail("");
    loadBuddies();
  }
  async function accept(id: string) { await supabase.from("friendships").update({ status: "accepted" }).eq("id", id); loadBuddies(); }
  async function removeFr(id: string, friendId?: string) {
    await supabase.from("friendships").delete().eq("id", id);
    if (friendId && chat?.id === friendId) { setChat(null); chatIdRef.current = null; }
    loadBuddies();
  }
  async function blockBuddy() {
    if (!uid || !chat) return;
    if (!window.confirm(`Zablokovat ${chat.name}? Přestanete si psát a nepůjde se znovu propojit.`)) return;
    await supabase.from("blocked_users").insert({ blocker_id: uid, blocked_id: chat.id });
    const b = buddies.find((x) => x.friend_id === chat.id);
    if (b) await supabase.from("friendships").delete().eq("id", b.friendship_id);
    setChat(null); chatIdRef.current = null;
    loadBuddies();
  }

  function pickImage(f: File) { setFile(f); setPreview(URL.createObjectURL(f)); }
  function clearImage() { setFile(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); }

  async function openChat(b: Buddy) {
    setChat({ id: b.friend_id, name: b.name });
    chatIdRef.current = b.friend_id;
    setEmojiOpen(false); clearImage();
    const { data } = await supabase
      .from("messages").select(MSG_COLS)
      .or(`and(sender_id.eq.${uid},recipient_id.eq.${b.friend_id}),and(sender_id.eq.${b.friend_id},recipient_id.eq.${uid})`)
      .order("created_at");
    setMessages((data ?? []) as Msg[]);
    markRead(b.friend_id);
  }

  async function sendMessage() {
    if (!uid || !chat || sending || (!msgBody.trim() && !file)) return;
    setSending(true);
    const body = msgBody.trim();
    let imageUrl: string | null = null;
    if (file) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `dm/${uid}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("community").upload(path, file, { upsert: true });
      if (upErr) { setSending(false); setInfo("Nahrání obrázku selhalo."); return; }
      imageUrl = supabase.storage.from("community").getPublicUrl(path).data.publicUrl;
    }
    setMsgBody(""); clearImage();
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: uid, recipient_id: chat.id, body, image_url: imageUrl })
      .select(MSG_COLS).single();
    setSending(false);
    if (!error && data) setMessages((arr) => (arr.some((x) => x.id === (data as Msg).id) ? arr : [...arr, data as Msg]));
  }

  if (!allowed) return null;

  const incoming = buddies.filter((b) => b.status === "pending" && b.direction === "in");
  const accepted = buddies
    .filter((b) => b.status === "accepted")
    .filter((b) => !listQuery.trim() || b.name.toLowerCase().includes(listQuery.trim().toLowerCase()))
    .sort((a, b) => (onlineIds.has(b.friend_id) ? 1 : 0) - (onlineIds.has(a.friend_id) ? 1 : 0));
  const totalUnread = Object.values(unread).reduce((s, n) => s + n, 0);
  const badge = incoming.length + totalUnread;

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label="Buddies"
          className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue text-white shadow-xl ring-1 ring-black/5 transition-transform hover:scale-105">
          <Users className="h-6 w-6" />
          {badge > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">{badge}</span>}
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 z-50 flex items-end gap-3">
          {/* CHAT */}
          {chat && (
            <div className="flex h-[70vh] max-h-[520px] w-[92vw] max-w-xs flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
              <div className="flex items-center gap-2 bg-brand-dark px-3 py-3 text-white">
                <button onClick={() => { setChat(null); chatIdRef.current = null; }} aria-label="Zpět" className="lg:hidden text-white/80 hover:text-white"><ArrowLeft className="h-5 w-5" /></button>
                <span className="relative">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-xs font-semibold">{(chat.name?.[0] ?? "B").toUpperCase()}</span>
                  {onlineIds.has(chat.id) && <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-brand-dark bg-emerald-400" />}
                </span>
                <div className="flex-1 leading-tight">
                  <Link href={`/profil/${chat.id}`} className="text-sm font-semibold hover:underline">{chat.name}</Link>
                  <p className="text-[11px] text-white/60">{typingFrom === chat.id ? "píše…" : onlineIds.has(chat.id) ? "online" : "offline"}</p>
                </div>
                <button onClick={blockBuddy} aria-label="Blokovat" title="Blokovat" className="text-white/60 hover:text-red-300"><Ban className="h-4 w-4" /></button>
                <button onClick={() => { setChat(null); chatIdRef.current = null; }} aria-label="Zavřít chat" className="hidden lg:block text-white/80 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-brand-light/40 p-3">
                {messages.length === 0 ? (
                  <p className="text-center text-xs text-gray-400">Napiš první zprávu. 👋</p>
                ) : messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === uid ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${m.sender_id === uid ? "bg-brand-blue text-white rounded-br-sm" : "bg-white text-brand-dark ring-1 ring-gray-200 rounded-bl-sm"}`}>
                      {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                      {m.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.image_url} alt="" className="mt-1 max-h-48 rounded-lg" />
                      )}
                    </div>
                  </div>
                ))}
                {typingFrom === chat.id && <p className="text-xs text-gray-400">{chat.name} píše…</p>}
              </div>
              {preview && (
                <div className="border-t border-gray-100 px-2 pt-2">
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="" className="max-h-24 rounded-lg" />
                    <button onClick={clearImage} className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow ring-1 ring-black/10"><X className="h-3.5 w-3.5 text-gray-500" /></button>
                  </div>
                </div>
              )}
              {emojiOpen && (
                <div className="flex flex-wrap gap-1 border-t border-gray-100 px-2 pt-2">
                  {EMOJIS.map((em) => <button key={em} onClick={() => setMsgBody((b) => b + em)} className="rounded-md p-1 text-lg hover:bg-brand-light">{em}</button>)}
                </div>
              )}
              <div className="flex items-center gap-1 border-t border-gray-100 p-2">
                <button onClick={() => setEmojiOpen((v) => !v)} aria-label="Emoji" className={`flex h-9 w-9 items-center justify-center rounded-full ${emojiOpen ? "text-brand-blue" : "text-gray-400 hover:text-brand-blue"}`}><Smile className="h-5 w-5" /></button>
                <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-gray-400 hover:text-brand-blue" aria-label="Obrázek">
                  <ImagePlus className="h-5 w-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f); e.target.value = ""; }} />
                </label>
                <input value={msgBody} onChange={(e) => onType(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }} placeholder="Zpráva…" className="flex-1 rounded-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                <button onClick={sendMessage} disabled={sending || (!msgBody.trim() && !file)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white disabled:opacity-50" aria-label="Odeslat"><Send className="h-4 w-4" /></button>
              </div>
            </div>
          )}

          {/* LIST */}
          <div className={`${chat ? "hidden lg:flex" : "flex"} h-[70vh] max-h-[520px] w-[92vw] max-w-xs flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10`}>
            <div className="flex items-center gap-2 bg-brand-dark px-4 py-3 text-white">
              <Users className="h-5 w-5" />
              <p className="flex-1 text-sm font-semibold">Buddies</p>
              <button onClick={() => setOpen(false)} aria-label="Zavřít" className="text-white/80 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
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
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue text-[11px] font-semibold text-white">{(b.name[0] ?? "B").toUpperCase()}</span>
                      <span className="flex-1 text-sm text-brand-dark">{b.name}</span>
                      <button onClick={() => accept(b.friendship_id)} className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={() => removeFr(b.friendship_id)} className="text-gray-300 hover:text-red-500"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input value={listQuery} onChange={(e) => setListQuery(e.target.value)} placeholder="Hledat buddyho…" className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
              </div>

              {accepted.length === 0 ? (
                <p className="text-xs text-gray-400">Zatím nikdo. Přidej si buddyho podle e-mailu výše. 🙂</p>
              ) : (
                <div className="space-y-1">
                  {accepted.map((b) => {
                    const online = onlineIds.has(b.friend_id);
                    const u = unread[b.friend_id] ?? 0;
                    return (
                      <div key={b.friendship_id} className={`flex items-center gap-2 rounded-lg p-1.5 hover:bg-brand-light/50 ${chat?.id === b.friend_id ? "bg-brand-light/60" : ""}`}>
                        <button onClick={() => openChat(b)} className="flex flex-1 items-center gap-2 text-left">
                          <span className="relative">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-xs font-semibold text-white">{(b.name[0] ?? "B").toUpperCase()}</span>
                            {online && <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-0.5">
                              <span className="truncate text-sm font-medium text-brand-dark">{b.name}</span>
                              <BadgePins ids={pins[b.friend_id]} size={14} />
                            </span>
                            <span className={`block text-[11px] ${typingFrom === b.friend_id ? "text-brand-blue" : online ? "text-emerald-600" : "text-gray-400"}`}>
                              {typingFrom === b.friend_id ? "píše…" : online ? "online" : "offline"}
                            </span>
                          </span>
                          {u > 0 ? (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">{u}</span>
                          ) : (
                            <MessageSquare className="h-4 w-4 text-brand-blue" />
                          )}
                        </button>
                        <button onClick={() => removeFr(b.friendship_id, b.friend_id)} className="text-gray-300 hover:text-red-500" aria-label="Odebrat"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
