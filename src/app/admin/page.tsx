"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GripVertical, Radio } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { TIER_STYLES, normalizeTier, tierToDb } from "@/lib/tiers";
import { MonthCalendar } from "@/components/admin/MonthCalendar";
import { VIDEO_COLS, type VideoRow } from "@/lib/content";
import {
  FILTER_BODY, FILTER_SYSTEMS, FILTER_PROPS, FILTER_GOALS, FILTER_SUITABILITY,
} from "@/lib/filters";
import { MOCK_VIDEOS } from "@/lib/mock-data";
import type { UserTier, AccessLevel } from "@/types";

const ACCESS_OPTS: AccessLevel[] = ["FREE", "MEMBER", "VIP", "VIP_PLUS"];
const DIFF_OPTS = ["začátečník", "mírně pokročilý", "pokročilý"];
function slugifyVideo(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50);
}
function toArr(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

const HOURS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00",
];
const DAYS = [
  { wd: 1, label: "Po" },
  { wd: 2, label: "Út" },
  { wd: 3, label: "St" },
  { wd: 4, label: "Čt" },
  { wd: 5, label: "Pá" },
];

type WeeklyRow = { weekday: number; time: string; is_free: boolean };
type EventRow = {
  id: string;
  date: string;
  title: string;
  kind: string;
  time: string | null;
  location: string | null;
  description: string | null;
  price_kc: number | null;
};
type OverrideRow = {
  id: string;
  date: string;
  time: string;
  status: "free" | "booked";
};
type Member = {
  id: string;
  email: string | null;
  full_name: string | null;
  tier: string;
};
type Booking = {
  id: string;
  service_name: string;
  date: string;
  time: string;
  mode: string;
  municipality: string | null;
  address: string | null;
  reason: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  price_kc: number;
  status: string;
  created_at: string;
};
type ReviewRow = {
  id: string;
  author_name: string;
  place: string | null;
  rating: number;
  text: string;
  approved: boolean;
  position: number | null;
  created_at: string;
};

export default function AdminPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  const [weekly, setWeekly] = useState<WeeklyRow[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [subscribers, setSubscribers] = useState<{ id: string; email: string; created_at: string }[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  // Formulář nového videa
  const [viTitle, setViTitle] = useState("");
  const [viDesc, setViDesc] = useState("");
  const [viAccess, setViAccess] = useState<AccessLevel>("FREE");
  const [viDiff, setViDiff] = useState("začátečník");
  const [viDur, setViDur] = useState("");
  const [viCf, setViCf] = useState("");
  const [viTags, setViTags] = useState("");
  const [viCaution, setViCaution] = useState("");
  const [viBody, setViBody] = useState<string[]>([]);
  const [viSystems, setViSystems] = useState<string[]>([]);
  const [viProps, setViProps] = useState<string[]>([]);
  const [viGoal, setViGoal] = useState<string[]>([]);
  const [viUnsuitable, setViUnsuitable] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const togArr = (arr: string[], set: (v: string[]) => void, val: string) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  // LIVE streamy
  type StreamRow = { id: string; title: string; description: string | null; embed_url: string | null; recording_url: string | null; starts_at: string };
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [stTitle, setStTitle] = useState("");
  const [stDesc, setStDesc] = useState("");
  const [stWhen, setStWhen] = useState("");
  const [stEmbed, setStEmbed] = useState("");
  const [stRec, setStRec] = useState("");

  // Měsíční výzva
  type ChallengeRow = { id: string; title: string; body: string | null };
  const [challenge, setChallenge] = useState<ChallengeRow | null>(null);
  const [chTitle, setChTitle] = useState("");
  const [chBody, setChBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Formulář nové recenze
  const [rvName, setRvName] = useState("");
  const [rvPlace, setRvPlace] = useState("");
  const [rvRating, setRvRating] = useState("5");
  const [rvText, setRvText] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Formulář nové akce
  const [evDate, setEvDate] = useState("");
  const [evTitle, setEvTitle] = useState("");
  const [evKind, setEvKind] = useState("Workshop");
  const [evTime, setEvTime] = useState("");
  const [evLocation, setEvLocation] = useState("");
  const [evDesc, setEvDesc] = useState("");
  const [evPrice, setEvPrice] = useState("");

  // Formulář nové výjimky
  const [ovDate, setOvDate] = useState("");
  const [ovTime, setOvTime] = useState("08:00");
  const [ovStatus, setOvStatus] = useState<"free" | "booked">("free");

  const admin = isAdminEmail(user?.email);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setChecking(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = useCallback(async () => {
    const [w, b, e, o, s, m, r, v, st, ch] = await Promise.all([
      supabase.from("availability_weekly").select("weekday,time,is_free"),
      supabase.from("bookings").select("*").order("date").order("time"),
      supabase.from("events").select("*").order("date"),
      supabase.from("availability_overrides").select("*").order("date"),
      supabase.from("subscribers").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,email,full_name,tier").order("email"),
      supabase.from("reviews").select("*").order("position", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
      supabase.from("videos").select(VIDEO_COLS).order("position", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
      supabase.from("streams").select("id, title, description, embed_url, recording_url, starts_at").order("starts_at", { ascending: false }),
      supabase.from("challenges").select("id, title, body").eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (w.data) setWeekly(w.data as WeeklyRow[]);
    if (b.data) setBookings(b.data as Booking[]);
    if (e.data) setEvents(e.data as EventRow[]);
    if (o.data) setOverrides(o.data as OverrideRow[]);
    if (s.data) setSubscribers(s.data as { id: string; email: string; created_at: string }[]);
    if (m.data) setMembers(m.data as Member[]);
    if (r.data) setReviews(r.data as ReviewRow[]);
    if (v.data) setVideos(v.data as VideoRow[]);
    if (st.data) setStreams(st.data as StreamRow[]);
    setChallenge((ch.data as ChallengeRow | null) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Akce ──
  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from("events").insert({
      date: evDate,
      title: evTitle,
      kind: evKind || "Akce",
      time: evTime || null,
      location: evLocation || null,
      description: evDesc || null,
      price_kc: evPrice === "" ? null : Number(evPrice),
    });
    if (error) { setError("Akci se nepodařilo uložit: " + error.message); return; }
    setEvDate(""); setEvTitle(""); setEvKind("Workshop"); setEvTime("");
    setEvLocation(""); setEvDesc(""); setEvPrice("");
    loadData();
  }
  async function deleteEvent(id: string) {
    setError(null);
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) { setError("Smazání akce selhalo: " + error.message); return; }
    setEvents((prev) => prev.filter((x) => x.id !== id));
  }

  // ── Výjimky pro konkrétní datum ──
  async function addOverride(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase
      .from("availability_overrides")
      .upsert({ date: ovDate, time: ovTime, status: ovStatus }, { onConflict: "date,time" });
    if (error) { setError("Výjimku se nepodařilo uložit: " + error.message); return; }
    setOvDate("");
    loadData();
  }
  async function deleteOverride(id: string) {
    setError(null);
    const { error } = await supabase.from("availability_overrides").delete().eq("id", id);
    if (error) { setError("Smazání výjimky selhalo: " + error.message); return; }
    setOverrides((prev) => prev.filter((x) => x.id !== id));
  }

  // ── Výjimky z měsíčního kalendáře (klik na hodinu konkrétního dne) ──
  async function setOverrideAt(date: string, time: string, status: "free" | "booked") {
    setError(null);
    const { error } = await supabase
      .from("availability_overrides")
      .upsert({ date, time, status }, { onConflict: "date,time" });
    if (error) { setError("Uložení výjimky selhalo: " + error.message); return; }
    await loadData();
  }
  async function resetOverrideAt(date: string, time: string) {
    setError(null);
    const { error } = await supabase
      .from("availability_overrides")
      .delete()
      .eq("date", date)
      .eq("time", time);
    if (error) { setError("Smazání výjimky selhalo: " + error.message); return; }
    await loadData();
  }

  // ── Členové (úroveň přístupu) ──
  async function setMemberTier(id: string, newTier: UserTier) {
    setError(null);
    const prev = members;
    // optimisticky
    setMembers((m) => m.map((x) => (x.id === id ? { ...x, tier: tierToDb(newTier) } : x)));
    const { error } = await supabase.rpc("set_user_tier", {
      target_id: id,
      new_tier: tierToDb(newTier),
    });
    if (error) {
      setMembers(prev);
      setError(
        "Změna úrovně selhala. Spustil jsi v Supabase membership.sql? (" + error.message + ")"
      );
    }
  }

  // ── Recenze ──
  async function addReview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const rating = Math.min(5, Math.max(1, Number(rvRating) || 5));
    const { error } = await supabase.from("reviews").insert({
      author_name: rvName.trim(),
      place: rvPlace.trim() || null,
      rating,
      text: rvText.trim(),
      approved: true,
    });
    if (error) { setError("Recenzi se nepodařilo uložit: " + error.message); return; }
    setRvName(""); setRvPlace(""); setRvRating("5"); setRvText("");
    loadData();
  }
  async function deleteReview(id: string) {
    setError(null);
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) { setError("Smazání recenze selhalo: " + error.message); return; }
    setReviews((prev) => prev.filter((x) => x.id !== id));
  }
  async function toggleReviewApproved(id: string, approved: boolean) {
    setError(null);
    const { error } = await supabase.from("reviews").update({ approved: !approved }).eq("id", id);
    if (error) { setError("Změna stavu recenze selhala: " + error.message); return; }
    setReviews((prev) => prev.map((x) => (x.id === id ? { ...x, approved: !approved } : x)));
  }
  async function handleReviewDrop(target: number) {
    if (dragIdx === null || dragIdx === target) { setDragIdx(null); return; }
    const arr = [...reviews];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(target, 0, moved);
    setReviews(arr);
    setDragIdx(null);
    setError(null);
    const { error } = await Promise.all(
      arr.map((r, i) => supabase.from("reviews").update({ position: i }).eq("id", r.id))
    ).then(() => ({ error: null })).catch((e) => ({ error: e }));
    if (error) setError("Uložení pořadí selhalo. Spustil jsi reviews_order.sql?");
  }

  // ── Videa ──
  async function addVideo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!viTitle.trim()) return;
    const row = {
      slug: `${slugifyVideo(viTitle)}-${Math.random().toString(36).slice(2, 5)}`,
      title: viTitle.trim(),
      description: viDesc.trim(),
      access_level: viAccess,
      body_parts: viBody,
      difficulty: viDiff,
      duration_seconds: Number(viDur) || 0,
      cf_uid: viCf.trim() || null,
      tags: toArr(viTags),
      caution: viCaution.trim() || null,
      systems: viSystems,
      props: viProps,
      problem_types: viGoal,
      unsuitable_for: viUnsuitable,
      published: true,
    };
    const { error } = await supabase.from("videos").insert(row);
    if (error) { setError("Video se nepodařilo uložit: " + error.message); return; }
    setViTitle(""); setViDesc(""); setViAccess("FREE"); setViDiff("začátečník");
    setViDur(""); setViCf(""); setViTags(""); setViCaution("");
    setViBody([]); setViSystems([]); setViProps([]); setViGoal([]); setViUnsuitable([]);
    loadData();
  }
  async function deleteVideo(id: string) {
    setError(null);
    const { error } = await supabase.from("videos").delete().eq("id", id);
    if (error) { setError("Smazání videa selhalo: " + error.message); return; }
    setVideos((prev) => prev.filter((x) => x.id !== id));
  }
  async function toggleVideoPublished(id: string, published: boolean) {
    setError(null);
    const { error } = await supabase.from("videos").update({ published: !published }).eq("id", id);
    if (error) { setError("Změna stavu videa selhala: " + error.message); return; }
    setVideos((prev) => prev.map((x) => (x.id === id ? { ...x, published: !published } : x)));
  }
  async function importMockVideos() {
    setImporting(true);
    setError(null);
    const rows = MOCK_VIDEOS.map((v) => ({
      slug: v.slug,
      title: v.title,
      description: v.description,
      access_level: v.accessLevel,
      body_parts: v.bodyParts,
      difficulty: v.difficulty,
      problem_types: v.problemTypes,
      equipment: v.equipment,
      tags: v.tags,
      duration_seconds: v.durationSeconds,
      caution: v.caution ?? null,
      published: true,
    }));
    const { error } = await supabase.from("videos").upsert(rows, { onConflict: "slug", ignoreDuplicates: true });
    setImporting(false);
    if (error) { setError("Import selhal: " + error.message); return; }
    loadData();
  }

  // ── LIVE streamy ──
  async function addStream(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!stTitle.trim() || !stWhen) { setError("Vyplň název a datum/čas streamu."); return; }
    const { error } = await supabase.from("streams").insert({
      title: stTitle.trim(),
      description: stDesc.trim(),
      starts_at: new Date(stWhen).toISOString(),
      embed_url: stEmbed.trim() || null,
      recording_url: stRec.trim() || null,
    });
    if (error) { setError("Stream se nepodařilo uložit: " + error.message); return; }
    setStTitle(""); setStDesc(""); setStWhen(""); setStEmbed(""); setStRec("");
    loadData();
  }
  async function deleteStream(id: string) {
    setError(null);
    const { error } = await supabase.from("streams").delete().eq("id", id);
    if (error) { setError("Smazání streamu selhalo: " + error.message); return; }
    setStreams((prev) => prev.filter((x) => x.id !== id));
  }

  // ── Měsíční výzva ──
  async function publishChallenge(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!chTitle.trim()) { setError("Vyplň název výzvy."); return; }
    await supabase.from("challenges").update({ active: false }).eq("active", true);
    const { error } = await supabase.from("challenges").insert({ title: chTitle.trim(), body: chBody.trim(), active: true });
    if (error) { setError("Výzvu se nepodařilo uložit: " + error.message); return; }
    setChTitle(""); setChBody("");
    loadData();
  }
  async function clearChallenge() {
    setError(null);
    await supabase.from("challenges").update({ active: false }).eq("active", true);
    setChallenge(null);
  }

  // ── Odběratelé newsletteru ──
  async function deleteSubscriber(id: string) {
    setError(null);
    const { error } = await supabase.from("subscribers").delete().eq("id", id);
    if (error) { setError("Odhlášení odběratele selhalo: " + error.message); return; }
    setSubscribers((prev) => prev.filter((x) => x.id !== id));
  }
  function copyEmails() {
    const text = subscribers.map((s) => s.email).join(", ");
    if (navigator.clipboard) navigator.clipboard.writeText(text);
  }

  useEffect(() => {
    if (admin) loadData();
  }, [admin, loadData]);

  const isFree = (wd: number, time: string) =>
    weekly.find((r) => r.weekday === wd && r.time === time)?.is_free ?? false;

  async function toggle(wd: number, time: string) {
    const key = `${wd}-${time}`;
    const current = isFree(wd, time);
    setSavingCell(key);
    setError(null);
    // optimisticky
    setWeekly((prev) =>
      prev.map((r) =>
        r.weekday === wd && r.time === time ? { ...r, is_free: !current } : r
      )
    );
    const { error } = await supabase
      .from("availability_weekly")
      .update({ is_free: !current })
      .eq("weekday", wd)
      .eq("time", time);
    setSavingCell(null);
    if (error) {
      // revert
      setWeekly((prev) =>
        prev.map((r) =>
          r.weekday === wd && r.time === time ? { ...r, is_free: current } : r
        )
      );
      setError(
        "Uložení se nezdařilo. Spustil jsi v Supabase admin-policies.sql? (" +
          error.message +
          ")"
      );
    }
  }

  // ── Stavy přístupu ──
  if (checking) {
    return <Centered>Načítám…</Centered>;
  }
  if (!user) {
    return (
      <Centered>
        <p className="mb-4">Tahle stránka je jen pro administrátora.</p>
        <Link href="/ucet" className="btn-primary">Přihlásit se</Link>
      </Centered>
    );
  }
  if (!admin) {
    return (
      <Centered>
        <p className="mb-2 font-semibold text-brand-dark">Nemáš oprávnění 🙈</p>
        <p className="text-sm text-gray-500">
          Přihlášený účet ({user.email}) není administrátor.
        </p>
      </Centered>
    );
  }

  // ── Admin obsah ──
  return (
    <div className="bg-brand-light min-h-screen py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-2">
          Administrace
        </p>
        <h1 className="text-3xl font-semibold text-brand-dark mb-8">Správa</h1>

        {error && (
          <p className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* ── Videa ── */}
        <section className="card p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
            <h2 className="text-lg font-semibold text-brand-dark">
              Videa <span className="text-gray-400 font-normal">({videos.length})</span>
            </h2>
            <button
              type="button"
              onClick={importMockVideos}
              disabled={importing}
              className="text-xs font-semibold text-brand-blue hover:underline disabled:opacity-50"
            >
              {importing ? "Importuji…" : "Importovat ukázková videa"}
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            Soubor nahraješ na Cloudflare Stream a sem vložíš jeho <strong>UID</strong>. Bez UID je
            video „bez přehrávače" – metadata ale fungují.
          </p>

          {videos.length > 0 && (
            <div className="space-y-2 mb-6">
              {videos.map((v) => {
                const t = normalizeTier(v.access_level);
                return (
                  <div key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-dark truncate">
                        {v.title}
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${TIER_STYLES[t].badge}`}>{TIER_STYLES[t].label}</span>
                        {!v.published && <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-[11px] text-gray-500">skryté</span>}
                        {!v.cf_uid && <span className="ml-2 text-[11px] font-medium text-amber-600">chybí Cloudflare UID</span>}
                      </p>
                      <p className="text-xs text-gray-400">{(v.body_parts ?? []).join(", ")}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={() => toggleVideoPublished(v.id, v.published)} className="text-xs font-semibold text-gray-400 hover:text-gray-600">
                        {v.published ? "Skrýt" : "Zveřejnit"}
                      </button>
                      <button type="button" onClick={() => deleteVideo(v.id)} className="text-xs font-semibold text-red-500 hover:text-red-700">Smazat</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={addVideo} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminInput label="Název *" value={viTitle} onChange={setViTitle} placeholder="Ranní mobilita" required />
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">Úroveň přístupu</label>
              <select value={viAccess} onChange={(e) => setViAccess(e.target.value as AccessLevel)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue">
                {ACCESS_OPTS.map((a) => <option key={a} value={a}>{TIER_STYLES[a].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">Obtížnost</label>
              <select value={viDiff} onChange={(e) => setViDiff(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue">
                {DIFF_OPTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <AdminInput label="Délka (vteřiny)" type="number" value={viDur} onChange={setViDur} placeholder="600" />
            <AdminInput label="Cloudflare UID (zatím nech prázdné)" value={viCf} onChange={setViCf} />
            <AdminInput label="Štítky (oddělené čárkou)" value={viTags} onChange={setViTags} placeholder="ráno, protažení" />

            <CheckGroup label="Část těla" options={FILTER_BODY} selected={viBody} onToggle={(v) => togArr(viBody, setViBody, v)} />
            <CheckGroup label="Systém" options={FILTER_SYSTEMS} selected={viSystems} onToggle={(v) => togArr(viSystems, setViSystems, v)} />
            <CheckGroup label="Co dům dá" options={FILTER_PROPS} selected={viProps} onToggle={(v) => togArr(viProps, setViProps, v)} />
            <CheckGroup label="Cíl" options={FILTER_GOALS} selected={viGoal} onToggle={(v) => togArr(viGoal, setViGoal, v)} />
            <CheckGroup label="Nevhodné pro (kontraindikace)" options={FILTER_SUITABILITY} selected={viUnsuitable} onToggle={(v) => togArr(viUnsuitable, setViUnsuitable, v)} />

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-brand-dark mb-1">Popis</label>
              <textarea value={viDesc} onChange={(e) => setViDesc(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-brand-dark mb-1">Upozornění / kontraindikace text (nepovinné)</label>
              <textarea value={viCaution} onChange={(e) => setViCaution(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary text-sm">Přidat video</button>
            </div>
          </form>
        </section>

        {/* ── Měsíční výzva ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">Měsíční výzva</h2>
          <p className="text-sm text-gray-500 mb-4">Krátká hravá výzva pro všechny. Zobrazí se každému v „Moje cesta".</p>
          {challenge && (
            <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-brand-dark">Aktuální: {challenge.title}</p>
              {challenge.body && <p className="text-xs text-gray-600 mt-0.5">{challenge.body}</p>}
              <button type="button" onClick={clearChallenge} className="mt-2 text-xs font-semibold text-red-500 hover:text-red-700">Ukončit výzvu</button>
            </div>
          )}
          <form onSubmit={publishChallenge} className="grid grid-cols-1 gap-3">
            <AdminInput label="Název výzvy *" value={chTitle} onChange={setChTitle} placeholder="Týden bez výmluv 💪" required />
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">Popis</label>
              <textarea value={chBody} onChange={(e) => setChBody(e.target.value)} rows={2} placeholder="Každý den 5 minut pohybu. Stačí málo, hlavně pravidelně!" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            <div><button type="submit" className="btn-primary text-sm">Zveřejnit výzvu</button></div>
          </form>
        </section>

        {/* ── LIVE streamy ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1 inline-flex items-center gap-2">
            <Radio className="h-5 w-5 text-amber-600" /> LIVE streamy <span className="text-gray-400 font-normal">({streams.length})</span>
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Naplánuj živý přenos. Odkaz z YouTube/Vimeo se vloží jako přehrávač, jiný se otevře odkazem. Záznam je pro VIP+ dostupný týden po streamu.
          </p>

          {streams.length > 0 && (
            <div className="space-y-2 mb-6">
              {streams.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">{s.title}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.starts_at).toLocaleString("cs-CZ")}{s.recording_url ? " · má záznam" : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => deleteStream(s.id)} className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700">Smazat</button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addStream} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminInput label="Název *" value={stTitle} onChange={setStTitle} placeholder="Ranní mobilita živě" required />
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">Datum a čas *</label>
              <input
                type="datetime-local"
                value={stWhen}
                onChange={(e) => setStWhen(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <AdminInput label="Odkaz na živý přenos" value={stEmbed} onChange={setStEmbed} placeholder="https://youtube.com/live/..." />
            <AdminInput label="Odkaz na záznam (po skončení)" value={stRec} onChange={setStRec} placeholder="https://youtube.com/watch?v=..." />
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-brand-dark mb-1">Popis</label>
              <textarea value={stDesc} onChange={(e) => setStDesc(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary text-sm">Přidat stream</button>
            </div>
          </form>
        </section>

        {/* ── Týdenní rozvrh ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">Týdenní rozvrh</h2>
          <p className="text-sm text-gray-500 mb-5">
            Klikni na hodinu = přepneš <span className="text-emerald-600 font-medium">volno</span> /{" "}
            <span className="text-gray-400 font-medium">obsazeno</span>. Platí každý týden.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="w-14"></th>
                  {DAYS.map((d) => (
                    <th key={d.wd} className="text-xs font-semibold text-gray-500 pb-1">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((time) => (
                  <tr key={time}>
                    <td className="text-xs text-gray-400 pr-2 text-right align-middle">{time}</td>
                    {DAYS.map((d) => {
                      const free = isFree(d.wd, time);
                      const key = `${d.wd}-${time}`;
                      return (
                        <td key={key}>
                          <button
                            type="button"
                            onClick={() => toggle(d.wd, time)}
                            disabled={savingCell === key}
                            className={`w-full h-9 rounded-md text-xs font-semibold transition-all ${
                              free
                                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            } ${savingCell === key ? "opacity-50" : ""}`}
                          >
                            {free ? "volno" : "—"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Měsíční kalendář ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">Kalendář měsíce</h2>
          <p className="text-sm text-gray-500 mb-5">
            Celý měsíc s možností listovat. Klikni na den a uprav dostupnost hodin
            jen pro to datum (výjimky). Týdenní rozvrh výše zůstává jako základ.
          </p>
          <MonthCalendar
            weekly={weekly}
            overrides={overrides}
            events={events}
            bookings={bookings}
            onSetOverride={setOverrideAt}
            onResetOverride={resetOverrideAt}
          />
        </section>

        {/* ── Akce / workshopy ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">
            Akce a workshopy <span className="text-gray-400 font-normal">({events.length})</span>
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Zobrazí se v kalendáři oranžovým puntíkem.
          </p>

          {/* Seznam */}
          {events.length > 0 && (
            <div className="space-y-2 mb-6">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">
                      {ev.date} · {ev.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {ev.kind}{ev.time ? ` · ${ev.time}` : ""}{ev.location ? ` · ${ev.location}` : ""}
                      {ev.price_kc != null ? ` · ${ev.price_kc === 0 ? "zdarma" : ev.price_kc + " Kč"}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteEvent(ev.id)}
                    className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700"
                  >
                    Smazat
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Přidat akci */}
          <form onSubmit={addEvent} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminInput label="Datum *" type="date" value={evDate} onChange={setEvDate} required />
            <AdminInput label="Název *" value={evTitle} onChange={setEvTitle} placeholder="Workshop: Zdravá záda" required />
            <AdminInput label="Typ" value={evKind} onChange={setEvKind} placeholder="Workshop / Seminář / Akce" />
            <AdminInput label="Čas" value={evTime} onChange={setEvTime} placeholder="10:00–13:00" />
            <AdminInput label="Místo" value={evLocation} onChange={setEvLocation} placeholder="Dobřichovice" />
            <AdminInput label="Cena (Kč, 0 = zdarma)" type="number" value={evPrice} onChange={setEvPrice} placeholder="890" />
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-brand-dark mb-1">Popis</label>
              <textarea
                value={evDesc}
                onChange={(e) => setEvDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm resize-none"
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary text-sm">Přidat akci</button>
            </div>
          </form>
        </section>

        {/* ── Výjimky pro konkrétní datum ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">
            Výjimky „pro tentokrát" <span className="text-gray-400 font-normal">({overrides.length})</span>
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Mimořádně uvolni nebo zaber hodinu na <strong>konkrétní datum</strong> (má přednost před týdenním rozvrhem).
          </p>

          {overrides.length > 0 && (
            <div className="space-y-2 mb-6">
              {overrides.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                  <p className="text-sm text-brand-dark">
                    {o.date} · {o.time} ·{" "}
                    <span className={o.status === "free" ? "text-emerald-600 font-semibold" : "text-gray-500 font-semibold"}>
                      {o.status === "free" ? "volno" : "obsazeno"}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => deleteOverride(o.id)}
                    className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700"
                  >
                    Smazat
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addOverride} className="flex flex-wrap items-end gap-3">
            <AdminInput label="Datum *" type="date" value={ovDate} onChange={setOvDate} required />
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">Hodina</label>
              <select
                value={ovTime}
                onChange={(e) => setOvTime(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm bg-white"
              >
                {HOURS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">Stav</label>
              <select
                value={ovStatus}
                onChange={(e) => setOvStatus(e.target.value as "free" | "booked")}
                className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm bg-white"
              >
                <option value="free">volno</option>
                <option value="booked">obsazeno</option>
              </select>
            </div>
            <button type="submit" className="btn-primary text-sm">Přidat výjimku</button>
          </form>
        </section>

        {/* ── Členové ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">
            Členové <span className="text-gray-400 font-normal">({members.length})</span>
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Přiřaď úroveň členství. Změna se projeví ihned a uživateli odemkne obsah.
          </p>

          {members.length === 0 ? (
            <p className="text-sm text-gray-400">Zatím žádní registrovaní uživatelé.</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const t = normalizeTier(m.tier);
                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-dark truncate">
                        {m.full_name || m.email || "—"}
                      </p>
                      {m.full_name && m.email && (
                        <p className="text-xs text-gray-500 truncate">{m.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${TIER_STYLES[t].badge}`}
                      >
                        {TIER_STYLES[t].label}
                      </span>
                      <select
                        value={t}
                        onChange={(e) => setMemberTier(m.id, e.target.value as UserTier)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                      >
                        <option value="FREE">FREE</option>
                        <option value="MEMBER">MEMBER</option>
                        <option value="VIP">VIP</option>
                        <option value="VIP_PLUS">VIP+</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Rezervace ── */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">
            Rezervace <span className="text-gray-400 font-normal">({bookings.length})</span>
          </h2>
          <p className="text-sm text-gray-500 mb-5">Příchozí rezervace od klientů.</p>

          {bookings.length === 0 ? (
            <p className="text-sm text-gray-400">Zatím žádné rezervace.</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div key={b.id} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-brand-dark">
                      {b.service_name} · {b.date} v {b.time}
                    </span>
                    <span className="text-sm font-semibold text-brand-blue">{b.price_kc} Kč</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                    <span>👤 {b.contact_name}</span>
                    <span>✉️ {b.contact_email}</span>
                    {b.contact_phone && <span>📞 {b.contact_phone}</span>}
                    <span>{b.mode === "online" ? "💻 Online" : "🏠 Osobně"}</span>
                    {b.municipality && (
                      <span className="sm:col-span-2">📍 {b.address}, {b.municipality}</span>
                    )}
                    {b.reason && (
                      <span className="sm:col-span-2 text-gray-500">„{b.reason}"</span>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Recenze ── */}
        <section className="card p-6 mt-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">
            Recenze <span className="text-gray-400 font-normal">({reviews.length})</span>
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Přidej recenzi (zobrazí se hned). Návrhy od členů se objeví jako neschválené – schválíš je tlačítkem.
          </p>

          {/* Seznam (přetažením změníš pořadí zobrazení na webu) */}
          {reviews.length > 0 && (
            <div className="space-y-2 mb-6">
              <p className="text-xs text-gray-400">Pořadí změníš přetažením za úchyt vlevo.</p>
              {reviews.map((r, i) => (
                <div
                  key={r.id}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleReviewDrop(i)}
                  onDragEnd={() => setDragIdx(null)}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${dragIdx === i ? "border-brand-blue bg-brand-light/40" : "border-gray-100"}`}
                >
                  <span
                    className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
                    title="Přetáhni pro změnu pořadí"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-dark">
                      {r.author_name}{r.place ? ` · ${r.place}` : ""}{" "}
                      <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                      {!r.approved && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">čeká na schválení</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{r.text}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleReviewApproved(r.id, r.approved)}
                      className={`text-xs font-semibold ${r.approved ? "text-gray-400 hover:text-gray-600" : "text-emerald-600 hover:text-emerald-700"}`}
                    >
                      {r.approved ? "Skrýt" : "Schválit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteReview(r.id)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700"
                    >
                      Smazat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Přidat recenzi */}
          <form onSubmit={addReview} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminInput label="Jméno *" value={rvName} onChange={setRvName} placeholder="Jan N." required />
            <AdminInput label="Obec" value={rvPlace} onChange={setRvPlace} placeholder="Dobřichovice" />
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">Hodnocení</label>
              <select
                value={rvRating}
                onChange={(e) => setRvRating(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm bg-white"
              >
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-brand-dark mb-1">Text recenze *</label>
              <textarea
                value={rvText}
                onChange={(e) => setRvText(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm resize-none"
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary text-sm">Přidat recenzi</button>
            </div>
          </form>
        </section>

        {/* ── Odběratelé newsletteru ── */}
        <section className="card p-6 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
            <h2 className="text-lg font-semibold text-brand-dark">
              Odběratelé newsletteru <span className="text-gray-400 font-normal">({subscribers.length})</span>
            </h2>
            {subscribers.length > 0 && (
              <button
                type="button"
                onClick={copyEmails}
                className="text-xs font-semibold text-brand-blue hover:underline"
              >
                Zkopírovat všechny e-maily
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-5">
            E-maily lidí, kteří se přihlásili k odběru novinek.
          </p>

          {subscribers.length === 0 ? (
            <p className="text-sm text-gray-400">Zatím žádní odběratelé.</p>
          ) : (
            <div className="space-y-2">
              {subscribers.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                  <span className="text-sm text-brand-dark truncate">{s.email}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400">
                      {new Date(s.created_at).toLocaleDateString("cs-CZ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteSubscriber(s.id)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700"
                    >
                      Odhlásit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CheckGroup({
  label, options, selected, onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="sm:col-span-2">
      <label className="block text-xs font-semibold text-brand-dark mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                on ? "bg-brand-blue text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-light hover:text-brand-blue"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AdminInput({
  label, value, onChange, type = "text", placeholder, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-brand-dark mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
      />
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
