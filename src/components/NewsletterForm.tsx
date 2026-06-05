"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "duplicate" | "error";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setStatus("success");
        setEmail("");
      } else if (data.status === "duplicate") {
        setStatus("duplicate");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="max-w-md mx-auto rounded-lg bg-emerald-500/15 border border-emerald-400/30 px-4 py-3 text-sm text-emerald-200">
        Hotovo! Jsi přihlášený k odběru. 🎉 Brzy se ozvu s novinkami.
      </p>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleSubmit}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tvůj@email.cz"
          className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-brand-blue text-sm"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-primary shrink-0 py-3 px-6 text-sm disabled:opacity-60"
        >
          {status === "loading" ? "Přihlašuji…" : "Přihlásit se"}
        </button>
      </form>
      {status === "duplicate" && (
        <p className="mt-3 text-sm text-white/70">Tenhle e-mail už odebírá – díky! 🙌</p>
      )}
      {status === "error" && (
        <p className="mt-3 text-sm text-red-300">
          Něco se nepovedlo. Zkus to prosím za chvíli znovu.
        </p>
      )}
    </div>
  );
}
