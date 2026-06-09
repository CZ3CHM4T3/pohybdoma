"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  Heart, BookOpen, GraduationCap, CalendarDays,
  KeyRound, LogOut, Settings, Camera, Save, Users, LineChart, ShieldCheck,
  Lock, LockOpen, X, Check, PartyPopper, UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TIER_STYLES, normalizeTier } from "@/lib/tiers";
import { canAccess } from "@/lib/access";
import { MOCK_COURSES, MOCK_MEMBERSHIP_PLANS } from "@/lib/mock-data";
import { MyBookingsCalendar, type MyBooking } from "@/components/MyBookingsCalendar";
import { MonthlyChallenge } from "@/components/MonthlyChallenge";
import type { UserTier, AccessLevel } from "@/types";

type Tab = "prihlaseni" | "registrace";

export default function UcetPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [tier, setTier] = useState<UserTier>("FREE");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tierSince, setTierSince] = useState<string | null>(null);
  const [tierUntil, setTierUntil] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [favVideos, setFavVideos] = useState<{ slug: string; title: string }[]>([]);
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [progress, setProgress] = useState<
    { slug: string; title: string; done: number; total: number; pct: number }[]
  >([]);
  const [accMsg, setAccMsg] = useState<string | null>(null);

  // Stav členství (modal s hierarchií) + zrušení přes heslo
  const [showMembership, setShowMembership] = useState(false);
  const [cancelStep, setCancelStep] = useState(false);
  const [cancelPwd, setCancelPwd] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelErr, setCancelErr] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("prihlaseni");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Načti profil přihlášeného uživatele (úroveň, fotka, platnost, jméno).
  useEffect(() => {
    if (!user) {
      setTier("FREE"); setAvatarUrl(null); setTierSince(null); setTierUntil(null);
      return;
    }
    supabase
      .from("profiles")
      .select("tier, avatar_url, tier_since, tier_until, full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setTier(normalizeTier(data?.tier as string | undefined));
        setAvatarUrl((data?.avatar_url as string | null) ?? null);
        setTierSince((data?.tier_since as string | null) ?? null);
        setTierUntil((data?.tier_until as string | null) ?? null);
        setNameInput(
          (data?.full_name as string | undefined) ||
            (user.user_metadata?.full_name as string | undefined) ||
            ""
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Načti oblíbená videa (slug + název z DB).
  useEffect(() => {
    if (!user) { setFavVideos([]); return; }
    (async () => {
      const { data: favs } = await supabase
        .from("video_favorites")
        .select("video_slug")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const slugs = (favs ?? []).map((r: { video_slug: string }) => r.video_slug);
      if (slugs.length === 0) { setFavVideos([]); return; }
      const { data: vids } = await supabase.from("videos").select("slug, title").in("slug", slugs);
      const titleBySlug = new Map((vids ?? []).map((v: { slug: string; title: string }) => [v.slug, v.title]));
      setFavVideos(slugs.filter((s) => titleBySlug.has(s)).map((s) => ({ slug: s, title: titleBySlug.get(s)! })));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Moje rezervace (všechny – pro měsíční kalendář).
  useEffect(() => {
    if (!user) { setBookings([]); return; }
    supabase
      .from("bookings")
      .select("id, service_name, date, time, status, mode, municipality, address, reason, price_kc")
      .eq("user_id", user.id)
      .order("date")
      .order("time")
      .then(({ data }) => setBookings((data ?? []) as MyBooking[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Postup v kurzech.
  useEffect(() => {
    if (!user) { setProgress([]); return; }
    supabase
      .from("lesson_progress")
      .select("course_slug, completed")
      .eq("user_id", user.id)
      .eq("completed", true)
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        for (const r of (data ?? []) as { course_slug: string }[]) {
          counts[r.course_slug] = (counts[r.course_slug] ?? 0) + 1;
        }
        const list = Object.entries(counts)
          .map(([slug, done]) => {
            const c = MOCK_COURSES.find((x) => x.slug === slug);
            const total = c?.lessons.length ?? 0;
            return { slug, title: c?.title ?? slug, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
          })
          .filter((x) => x.total > 0)
          .sort((a, b) => b.pct - a.pct);
        setProgress(list);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function sendPasswordReset() {
    if (!user?.email) return;
    setAccMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/obnova-hesla`,
    });
    setAccMsg(error ? "Nepodařilo se odeslat: " + error.message : "Poslal jsem ti e-mail pro změnu hesla.");
  }

  async function uploadAvatar(file: File) {
    if (!user) return;
    setUploadingAvatar(true);
    setAccMsg(null);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) {
      setUploadingAvatar(false);
      setAccMsg("Nahrání fotky selhalo (" + upErr.message + "). Spustil jsi account.sql?");
      return;
    }
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setUploadingAvatar(false);
    if (updErr) {
      setAccMsg("Uložení fotky selhalo: " + updErr.message);
      return;
    }
    setAvatarUrl(url);
    setAccMsg("Profilová fotka aktualizována. ✅");
  }

  async function cancelBooking(id: string) {
    if (!user) return;
    if (!window.confirm("Opravdu zrušit tuto rezervaci? Tuto akci nelze vrátit.")) return;
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (!error) {
      setBookings((arr) => arr.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)));
    }
  }

  async function confirmCancelMembership() {
    if (!user?.email) return;
    setCancelBusy(true);
    setCancelErr(null);
    // Potvrzení heslem (ověření re-přihlášením)
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: cancelPwd,
    });
    if (authErr) {
      setCancelBusy(false);
      setCancelErr("Nesprávné heslo. Zkus to prosím znovu.");
      return;
    }
    const { error } = await supabase.rpc("cancel_my_membership");
    setCancelBusy(false);
    if (error) {
      setCancelErr("Zrušení členství selhalo: " + error.message);
      return;
    }
    setTier("FREE");
    setTierSince(null);
    setTierUntil(null);
    setCancelStep(false);
    setCancelPwd("");
    setShowMembership(false);
    setAccMsg("Členství zrušeno – jsi na úrovni FREE.");
  }

  async function saveName() {
    if (!user || !nameInput.trim()) return;
    setSavingName(true);
    setAccMsg(null);
    const { error: e1 } = await supabase.from("profiles").update({ full_name: nameInput.trim() }).eq("id", user.id);
    await supabase.auth.updateUser({ data: { full_name: nameInput.trim() } });
    setSavingName(false);
    setAccMsg(e1 ? "Uložení jména selhalo: " + e1.message : "Jméno uloženo. ✅");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes("Invalid login")
          ? "Nesprávný e-mail nebo heslo."
          : error.message.includes("Email not confirmed")
            ? "E-mail ještě není potvrzený. Zkontroluj schránku."
            : "Přihlášení se nezdařilo: " + error.message
      );
      return;
    }
    router.refresh();
  }

  async function handleForgot() {
    if (!email) {
      setInfo(null);
      setError("Nejdřív vyplň svůj e-mail v poli výše.");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/obnova-hesla`,
    });
    setLoading(false);
    if (error) {
      setError("Odkaz se nepodařilo odeslat: " + error.message);
      return;
    }
    setInfo("Poslal jsem ti e-mail s odkazem na obnovu hesla. Zkontroluj schránku.");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/ucet` : undefined,
      },
    });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes("already registered")
          ? "Tento e-mail už je zaregistrovaný. Přihlas se."
          : "Registrace se nezdařila: " + error.message
      );
      return;
    }
    // Pokud je zapnuté potvrzení e-mailu, session zatím není.
    if (!data.session) {
      setInfo("Hotovo! Poslal jsem ti potvrzovací e-mail – klikni na odkaz a pak se přihlas.");
      setTab("prihlaseni");
    } else {
      router.refresh();
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  }

  // ── Přihlášený pohled ──
  if (!checking && user) {
    const displayName =
      nameInput || (user.user_metadata?.full_name as string | undefined) || user.email || "";
    const fmtDate = (s: string | null) =>
      s ? new Date(s).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" }) : null;
    const daysLeft = tierUntil
      ? Math.ceil((new Date(tierUntil).getTime() - Date.now()) / 86400000)
      : null;
    const tiles: {
      label: string;
      Icon: typeof BookOpen;
      href?: string;
      req?: AccessLevel;
      action?: "membership";
    }[] = [
      { href: "/videoknihovna", label: "Moje videa", Icon: BookOpen },
      { href: "/kurzy", label: "Moje kurzy", Icon: GraduationCap },
      { href: "#moje-rezervace", label: "Moje rezervace", Icon: CalendarDays },
      { label: "Stav členství", Icon: ShieldCheck, action: "membership" },
      { href: "/kruhy", label: "Mé kruhy", Icon: Users, req: "MEMBER" },
      { href: "/chlubirna", label: "Chlubírna", Icon: PartyPopper, req: "MEMBER" },
      { href: "/buddies", label: "Parťáci", Icon: UserPlus, req: "MEMBER" },
      { href: "/denik", label: "Můj deník", Icon: LineChart, req: "VIP" },
    ];

    // Hierarchie členství (pro dlaždici „Stav členství")
    const planByTier = Object.fromEntries(MOCK_MEMBERSHIP_PLANS.map((p) => [p.tier, p]));
    const membershipHierarchy: { tier: UserTier; tagline?: string; price: number; features: string[] }[] = [
      { tier: "FREE", tagline: "Na vyzkoušení", price: 0, features: ["Ukázková videa zdarma", "Základní přístup k webu"] },
      ...(["MEMBER", "VIP", "VIP_PLUS"] as UserTier[]).map((t) => {
        const p = planByTier[t];
        return { tier: t, tagline: p?.tagline, price: p?.priceKcMonth ?? 0, features: p?.features ?? [] };
      }),
    ];
    return (
      <div className="min-h-screen bg-brand-light py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Název stránky */}
          <div className="mb-6">
            <h1 className="text-3xl lg:text-4xl font-semibold text-brand-dark">Moje cesta</h1>
            <p className="mt-1 text-gray-500">
              Vítej zpět{displayName ? `, ${displayName}` : ""}! Tvoje základna na jednom místě.
            </p>
          </div>

          {/* Hlavička */}
          <div className="card p-6 mb-6 flex flex-wrap items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue text-2xl font-semibold text-white">
                {(displayName?.[0] ?? "U").toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-brand-dark truncate">{displayName}</h2>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </div>
            <div className="ml-auto flex flex-col items-end gap-1">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${TIER_STYLES[tier].badge}`}>
                  {TIER_STYLES[tier].label}
                </span>
                {tier !== "VIP_PLUS" && (
                  <Link href="/clenstvi" className="text-xs font-semibold text-brand-blue hover:underline whitespace-nowrap">
                    Vylepšit →
                  </Link>
                )}
              </div>
              {tier !== "FREE" && tierUntil && (
                <span className="text-[11px] text-gray-400">
                  platí do {fmtDate(tierUntil)}
                  {daysLeft != null && daysLeft >= 0 ? ` · zbývá ${daysLeft} dní` : " · vypršelo"}
                </span>
              )}
            </div>
          </div>

          {/* Měsíční výzva (pro všechny) */}
          <MonthlyChallenge />

          {/* Rychlé dlaždice */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {tiles.map((t) => {
              const Icon = t.Icon;
              const locked = !!t.req && !canAccess(tier, t.req);

              // Dlaždice „Stav členství" – otevře hierarchii členství
              if (t.action === "membership") {
                return (
                  <button
                    key="membership"
                    type="button"
                    onClick={() => setShowMembership(true)}
                    className="card card-3d p-4 flex flex-col items-center justify-center gap-2 text-center"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand-blue">
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="text-xs font-semibold text-brand-dark">{t.label}</span>
                  </button>
                );
              }

              // Zamčená dlaždice (nedosažitelná úroveň) → odkaz na koupi členství
              if (locked) {
                return (
                  <Link
                    key={t.label}
                    href="/clenstvi"
                    className="group relative card card-3d p-4 flex flex-col items-center justify-center gap-2 text-center overflow-hidden"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand-blue opacity-30">
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="text-xs font-semibold text-brand-dark opacity-30">{t.label}</span>
                    <span className={`absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${TIER_STYLES[t.req!].badge}`}>
                      {TIER_STYLES[t.req!].label}
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-125">
                        <Lock className="h-4 w-4 text-brand-dark group-hover:hidden" strokeWidth={2} />
                        <LockOpen className="hidden h-4 w-4 text-brand-blue group-hover:block" strokeWidth={2} />
                      </span>
                    </span>
                  </Link>
                );
              }

              // Běžná dlaždice
              return (
                <Link
                  key={t.href}
                  href={t.href!}
                  className="card card-3d p-4 flex flex-col items-center justify-center gap-2 text-center"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand-blue">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="text-xs font-semibold text-brand-dark">{t.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Dva sloupce */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Levý sloupec */}
            <div className="space-y-6">
              {/* Rozjeté kurzy */}
              <div className="card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-brand-blue" strokeWidth={2} />
                  <h2 className="text-sm font-semibold text-brand-dark">Rozjeté kurzy</h2>
                </div>
                {progress.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    Zatím ses nepustil do žádného kurzu.{" "}
                    <Link href="/kurzy" className="text-brand-blue hover:underline">Vyber si →</Link>
                  </p>
                ) : (
                  <div className="space-y-4">
                    {progress.map((p) => (
                      <Link key={p.slug} href={`/kurzy/${p.slug}`} className="block group">
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium text-brand-dark group-hover:text-brand-blue truncate">{p.title}</span>
                          <span className="ml-2 shrink-0 text-xs text-gray-400">{p.done}/{p.total}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${p.pct}%` }} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Pravý sloupec */}
            <div className="space-y-6">
              {/* Oblíbená videa */}
              <div className="card p-6">
                <div className="mb-3 flex items-center gap-2">
                  <Heart className="h-4 w-4 fill-rose-500 text-rose-500" strokeWidth={2} />
                  <h2 className="text-sm font-semibold text-brand-dark">
                    Oblíbená videa{favVideos.length > 0 ? ` (${favVideos.length})` : ""}
                  </h2>
                </div>
                {favVideos.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    Zatím nic uloženého. V knihovně klikni na srdíčko u videa.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {favVideos.map((v) => (
                      <Link
                        key={v.slug}
                        href={`/videoknihovna/${v.slug}`}
                        className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm text-brand-dark hover:border-brand-blue hover:bg-brand-light/50 transition-colors"
                      >
                        <Heart className="h-3.5 w-3.5 shrink-0 fill-rose-500 text-rose-500" />
                        <span className="truncate">{v.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Moje rezervace – měsíční kalendář */}
          <div id="moje-rezervace" className="card p-6 mt-6 scroll-mt-24">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand-blue" strokeWidth={2} />
              <h2 className="text-sm font-semibold text-brand-dark">Moje rezervace</h2>
              <Link href="/rezervace" className="ml-auto text-xs font-semibold text-brand-blue hover:underline">
                Rezervovat →
              </Link>
            </div>
            <MyBookingsCalendar bookings={bookings} onCancel={cancelBooking} />
          </div>

          {/* Nastavení */}
          <div className="card p-6 mt-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand-dark">
              <Settings className="h-4 w-4 text-gray-400" /> Nastavení
            </h2>
            {accMsg && (
              <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">{accMsg}</p>
            )}

            <div className="space-y-5">
              {/* Profilová fotka */}
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-blue">
                    <Camera className="h-5 w-5" strokeWidth={2} />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-brand-dark">Profilová fotka</p>
                  <label className="cursor-pointer text-xs font-semibold text-brand-blue hover:underline">
                    {uploadingAvatar ? "Nahrávám…" : "Změnit fotku"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingAvatar}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadAvatar(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Jméno */}
              <div>
                <label className="block text-sm font-semibold text-brand-dark mb-1.5">Jméno</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Tvoje jméno"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                  <button
                    onClick={saveName}
                    disabled={savingName || !nameInput.trim()}
                    className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-40"
                  >
                    <Save className="h-4 w-4" /> Uložit
                  </button>
                </div>
              </div>

              {/* Heslo + odhlášení */}
              <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
                <button onClick={sendPasswordReset} className="btn-outline text-sm inline-flex items-center gap-2">
                  <KeyRound className="h-4 w-4" /> Změnit heslo
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-brand-dark"
                >
                  <LogOut className="h-4 w-4" /> Odhlásit se
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal: hierarchie členství */}
        {showMembership && (
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
            onClick={() => { setShowMembership(false); setCancelStep(false); setCancelErr(null); }}
          >
            <div
              className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setShowMembership(false); setCancelStep(false); setCancelErr(null); }}
                aria-label="Zavřít"
                className="absolute right-4 top-4 text-gray-400 hover:text-brand-dark"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-xl font-semibold text-brand-dark">Tvoje členství</h2>
              <p className="mt-1 text-sm text-gray-500">
                Aktuálně máš úroveň <strong className={TIER_STYLES[tier].accentText}>{TIER_STYLES[tier].label}</strong>.
                {tier !== "FREE" && tierUntil &&
                  ` Platí do ${fmtDate(tierUntil)}${daysLeft != null && daysLeft >= 0 ? ` (zbývá ${daysLeft} dní)` : ""}.`}
              </p>

              <div className="mt-5 space-y-3">
                {membershipHierarchy.map((m) => {
                  const current = m.tier === tier;
                  return (
                    <div
                      key={m.tier}
                      className={`rounded-xl border p-4 ${
                        current
                          ? `${TIER_STYLES[m.tier].card} border-transparent ring-2 ring-offset-1 ring-brand-blue/40`
                          : "border-gray-200 bg-gray-50 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${current ? TIER_STYLES[m.tier].badge : "bg-gray-200 text-gray-500"}`}>
                            {TIER_STYLES[m.tier].label}
                          </span>
                          {m.tagline && <span className={`text-xs ${current ? "text-gray-600" : "text-gray-400"}`}>{m.tagline}</span>}
                        </div>
                        {current ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <Check className="h-4 w-4" /> Máš
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-gray-400">{m.price > 0 ? `${m.price} Kč/měs` : "zdarma"}</span>
                        )}
                      </div>
                      {m.features.length > 0 && (
                        <ul className={`mt-2 space-y-1 text-xs ${current ? "text-gray-700" : "text-gray-400"}`}>
                          {m.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${current ? TIER_STYLES[m.tier].accentText : "text-gray-300"}`} />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                {tier !== "VIP_PLUS" && (
                  <Link href="/clenstvi" className="btn-primary text-sm">
                    {tier === "FREE" ? "Vybrat členství" : "Změnit úroveň"}
                  </Link>
                )}
                {tier !== "FREE" && !cancelStep && (
                  <button
                    onClick={() => { setCancelStep(true); setCancelErr(null); setCancelPwd(""); }}
                    className="text-xs font-semibold text-red-500 hover:text-red-700"
                  >
                    Zrušit členství
                  </button>
                )}
              </div>

              {cancelStep && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-700">Zrušit členství?</p>
                  <p className="mt-0.5 text-xs text-red-600">Přejdeš na úroveň FREE. Pro potvrzení zadej své heslo.</p>
                  {cancelErr && <p className="mt-2 text-xs font-medium text-red-700">{cancelErr}</p>}
                  <input
                    type="password"
                    value={cancelPwd}
                    onChange={(e) => setCancelPwd(e.target.value)}
                    placeholder="Tvoje heslo"
                    className="mt-2 w-full rounded-lg border border-red-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={confirmCancelMembership}
                      disabled={cancelBusy || !cancelPwd}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {cancelBusy ? "Ruším…" : "Potvrdit zrušení"}
                    </button>
                    <button
                      onClick={() => { setCancelStep(false); setCancelErr(null); setCancelPwd(""); }}
                      className="text-xs font-semibold text-gray-500 hover:text-brand-dark"
                    >
                      Zpět
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Nepřihlášený pohled (login / registrace) ──
  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-brand-dark">Tvůj účet</h1>
          <p className="text-sm text-gray-500 mt-1">
            Přihlas se nebo si vytvoř účet
          </p>
        </div>

        <div className="card p-8">
          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-7">
            {(["prihlaseni", "registrace"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(null); setInfo(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                  tab === t ? "bg-white shadow text-brand-dark" : "text-gray-500 hover:text-brand-dark"
                }`}
              >
                {t === "prihlaseni" ? "Přihlásit se" : "Registrace"}
              </button>
            ))}
          </div>

          {error && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {info && (
            <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {info}
            </p>
          )}

          {tab === "prihlaseni" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <Field id="login-email" label="E-mail" type="email" value={email} onChange={setEmail} placeholder="vas@email.cz" />
              <Field id="login-password" label="Heslo" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
                {loading ? "Přihlašuji…" : "Přihlásit se"}
              </button>
              <button
                type="button"
                onClick={handleForgot}
                disabled={loading}
                className="block w-full text-center text-xs font-semibold text-gray-500 hover:text-brand-blue disabled:opacity-50"
              >
                Zapomněl jsi heslo?
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <Field id="reg-name" label="Jméno" type="text" value={name} onChange={setName} placeholder="Jan Novák" />
              <Field id="reg-email" label="E-mail" type="email" value={email} onChange={setEmail} placeholder="vas@email.cz" />
              <Field id="reg-password" label="Heslo" type="password" value={password} onChange={setPassword} placeholder="alespoň 6 znaků" minLength={6} />
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
                {loading ? "Vytvářím účet…" : "Vytvořit účet"}
              </button>
              <p className="text-xs text-center text-gray-400">
                Registrací souhlasíš s{" "}
                <Link href="/obchodni-podminky" className="text-brand-blue hover:underline">obchodními podmínkami</Link>{" "}
                a{" "}
                <Link href="/gdpr" className="text-brand-blue hover:underline">ochranou dat</Link>.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  id, label, type, value, onChange, placeholder, minLength,
}: {
  id: string; label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder?: string; minLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-brand-dark mb-1.5" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
      />
    </div>
  );
}
