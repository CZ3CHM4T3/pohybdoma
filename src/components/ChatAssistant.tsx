"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";

const NAME = "Jeník";
const AVATAR_SRC = "/asistent.png"; // sem hoď svou miniaturu (PNG, ideálně průhledné pozadí)

type Msg = { role: "user" | "assistant"; content: string };

const WELCOME: Msg = {
  role: "assistant",
  content: `Ahoj, jsem ${NAME} 🤸 Rád ti pomůžu zorientovat se na POHYB DOMA – najít cvičení, vysvětlit funkce, poradit s členstvím, rezervací nebo účtem. S čím začneme?`,
};

function Avatar({ className = "" }: { className?: string }) {
  const [ok, setOk] = useState(true);
  if (ok) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={AVATAR_SRC}
        alt={NAME}
        onError={() => setOk(false)}
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    <span className={`flex items-center justify-center bg-brand-blue text-white ${className}`}>
      <Sparkles className="h-1/2 w-1/2" />
    </span>
  );
}

export function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/asistent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m !== WELCOME) }),
      });
      const data = await res.json();
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: data.reply || data.error || "Něco se nepovedlo." },
      ]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Nepodařilo se spojit. Zkus to prosím znovu." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes pd-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        .pd-float{ animation: pd-float 3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce){ .pd-float{ animation:none } }
      `}</style>

      {/* Plovoucí tlačítko */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Zeptej se – ${NAME}`}
          className="group fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-white py-2 pl-2 pr-4 shadow-xl ring-1 ring-black/5 transition-transform hover:scale-105"
        >
          <span className="pd-float relative flex h-11 w-11 overflow-hidden rounded-full ring-2 ring-brand-blue/30">
            <Avatar className="h-full w-full" />
          </span>
          <span className="text-sm font-semibold text-brand-dark">Poradím ti 👋</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
          {/* Hlavička */}
          <div className="flex items-center gap-3 bg-brand-dark px-4 py-3 text-white">
            <span className="pd-float flex h-9 w-9 overflow-hidden rounded-full ring-2 ring-white/30">
              <Avatar className="h-full w-full" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-tight">{NAME}</p>
              <p className="text-[11px] text-white/70 leading-tight">Průvodce webem POHYB DOMA</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Zavřít" className="text-white/80 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Zprávy */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-brand-light/40 p-4">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-brand-blue text-white rounded-br-sm"
                      : "bg-white text-brand-dark ring-1 ring-gray-200 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm text-gray-400 ring-1 ring-gray-200">
                  {NAME} píše…
                </div>
              </div>
            )}
          </div>

          {/* Vstup */}
          <div className="flex items-center gap-2 border-t border-gray-100 p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Napiš dotaz…"
              className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            <button
              type="button"
              onClick={send}
              disabled={busy || !input.trim()}
              aria-label="Odeslat"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
