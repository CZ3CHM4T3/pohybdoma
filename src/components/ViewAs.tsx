"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";

export type ViewAsRole = "admin" | "visitor" | "FREE" | "MEMBER" | "VIP" | "VIP_PLUS";
const ROLES: ViewAsRole[] = ["visitor", "FREE", "MEMBER", "VIP", "VIP_PLUS"];

const Ctx = createContext<{ viewAs: ViewAsRole; setViewAs: (r: ViewAsRole) => void }>({
  viewAs: "admin",
  setViewAs: () => {},
});

export function useViewAs() {
  return useContext(Ctx);
}

function readCookie(): ViewAsRole {
  if (typeof document === "undefined") return "admin";
  const m = document.cookie.match(/(?:^|; )pd_view_as=([^;]+)/);
  const v = m ? decodeURIComponent(m[1]) : "admin";
  return (ROLES as string[]).includes(v) ? (v as ViewAsRole) : "admin";
}

export function ViewAsProvider({ children }: { children: React.ReactNode }) {
  const [viewAs, setViewAsState] = useState<ViewAsRole>("admin");
  useEffect(() => { setViewAsState(readCookie()); }, []);
  function setViewAs(r: ViewAsRole) {
    document.cookie = `pd_view_as=${r}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
    setViewAsState(r);
    // reload – ať se projeví i serverové vykreslení a middleware (režim „připravuje se")
    if (typeof window !== "undefined") window.location.reload();
  }
  return <Ctx.Provider value={{ viewAs, setViewAs }}>{children}</Ctx.Provider>;
}

const LABELS: [ViewAsRole, string][] = [
  ["admin", "Admin"],
  ["visitor", "Návštěvník"],
  ["FREE", "FREE"],
  ["MEMBER", "MEMBER"],
  ["VIP", "VIP"],
  ["VIP_PLUS", "VIP+"],
];

/** Plovoucí lišta jen pro admina: přepínání pohledu (návštěvník / typy členství). */
export function ViewAsBar() {
  const { viewAs, setViewAs } = useViewAs();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const s = createClient();
    s.auth.getUser().then(({ data }) => setIsAdmin(isAdminEmail(data.user?.email)));
  }, []);

  if (!isAdmin) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 left-3 z-[60] rounded-full bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:opacity-90"
      >
        👁 Zobrazit jako{viewAs !== "admin" ? `: ${LABELS.find(([r]) => r === viewAs)?.[1]}` : ""}
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 left-3 z-[60] max-w-[calc(100vw-1.5rem)] rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
      <div className="mb-1.5 flex items-center gap-2 px-1">
        <span className="text-[11px] font-semibold text-gray-500">👁 Zobrazíš jako</span>
        {viewAs !== "admin" && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">náhled</span>
        )}
        <button type="button" onClick={() => setOpen(false)} className="ml-auto text-gray-300 hover:text-gray-600" aria-label="Schovat">✕</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {LABELS.map(([role, label]) => {
          const active = viewAs === role;
          return (
            <button
              key={role}
              type="button"
              onClick={() => { if (!active) setViewAs(role); }}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? role === "admin" ? "bg-brand-dark text-white" : "bg-brand-blue text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {viewAs !== "admin" && (
        <button
          type="button"
          onClick={() => setViewAs("admin")}
          className="mt-1.5 w-full rounded-md border border-brand-dark px-2.5 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand-light"
        >
          ← Zpět na admina
        </button>
      )}
    </div>
  );
}
