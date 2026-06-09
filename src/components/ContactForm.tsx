"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ContactForm() {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Předvyplnění podle ?zajem= (z karet členství)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const z = new URLSearchParams(window.location.search).get("zajem");
    if (z) {
      setTopic("Zájem o členství " + z);
      setMessage(`Ahoj Honzo, mám zájem o členství ${z}. `);
    }
    // předvyplň jméno/e-mail přihlášeného
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) return;
      setEmail((e) => e || u.email || "");
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", u.id).maybeSingle();
      const fn = (p?.full_name as string | undefined) || (u.user_metadata?.full_name as string | undefined);
      if (fn) setName((n) => n || fn);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("contact_messages").insert({
      name: name.trim(),
      email: email.trim(),
      topic: topic.trim() || null,
      message: message.trim(),
    });
    setBusy(false);
    if (error) { setErr("Nepodařilo se odeslat: " + error.message); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-semibold text-brand-dark">Díky za zprávu! 🙌</p>
        <p className="mt-1 text-sm text-gray-500">Ozvu se ti, jak nejdřív to půjde. — Honza</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-3">
      <h2 className="font-semibold text-brand-dark">Napiš mi</h2>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jméno" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="E-mail" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      </div>
      <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Téma (nepovinné)" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Tvoje zpráva…" className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
      <button type="submit" disabled={busy || !name.trim() || !email.trim() || !message.trim()} className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-50">
        <Send className="h-4 w-4" /> {busy ? "Odesílám…" : "Odeslat zprávu"}
      </button>
    </form>
  );
}
