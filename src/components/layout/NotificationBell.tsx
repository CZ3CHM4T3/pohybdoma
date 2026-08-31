"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Note = { id: string; title: string; body: string | null; read: boolean; created_at: string };

export function NotificationBell() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setUid(u.id);
      supabase
        .from("app_notifications")
        .select("id,title,body,read,created_at")
        .order("created_at", { ascending: false })
        .limit(30)
        .then(({ data: rows }) => { if (rows) setNotes(rows as Note[]); });
      channel = supabase
        .channel(`notif-${u.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "app_notifications", filter: `user_id=eq.${u.id}` },
          (payload) => setNotes((prev) => [payload.new as Note, ...prev].slice(0, 30)))
        .subscribe();
    });
    return () => { if (channel) createClient().removeChannel(channel); };
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const unread = notes.filter((n) => !n.read).length;

  async function toggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unread > 0) {
      const ids = notes.filter((n) => !n.read).map((n) => n.id);
      setNotes((prev) => prev.map((n) => ({ ...n, read: true })));
      await createClient().from("app_notifications").update({ read: true }).in("id", ids);
    }
  }

  if (!uid) return null;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={toggle} className="relative p-2 rounded-lg text-brand-dark hover:bg-brand-light transition-colors" aria-label="Upozornění">
        <Bell className="h-5 w-5" strokeWidth={2} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg z-50">
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-50">Upozornění</p>
          {notes.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">Zatím nic. 🙂</p>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="px-4 py-2.5 border-b border-gray-50 last:border-0">
                <p className="text-sm font-semibold text-brand-dark">{n.title}</p>
                {n.body && <p className="text-xs text-gray-500">{n.body}</p>}
                <p className="text-[10px] text-gray-300 mt-0.5">{new Date(n.created_at).toLocaleString("cs-CZ")}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
