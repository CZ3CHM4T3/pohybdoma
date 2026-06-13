"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, StickyNote, ChevronDown, Lock } from "lucide-react";
import type { CourseLesson, UserTier } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { formatDuration, canAccess } from "@/lib/access";
import { normalizeTier } from "@/lib/tiers";
import { getDemoTierClient } from "@/lib/demo-client";
import { AccessBadge } from "@/components/ui/Badge";
import { LockBadge } from "@/components/ui/LockBadge";

type ProgressRow = { completed: boolean; note: string };

export function CourseLessons({
  courseSlug,
  lessons,
}: {
  courseSlug: string;
  lessons: CourseLesson[];
}) {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [userTier, setUserTier] = useState<UserTier>("FREE");
  const [progress, setProgress] = useState<Record<string, ProgressRow>>({});
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  const totalDuration = lessons.reduce((s, l) => s + l.durationSeconds, 0);
  const freeLessons = lessons.filter((l) => l.accessLevel === "FREE").length;
  const doneCount = lessons.filter((l) => progress[l.id]?.completed).length;
  const pct = lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0;

  // Časovače pro autosave poznámek (per lekce)
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Načti přihlášeného uživatele + jeho postup v tomto kurzu.
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      setChecking(false);
      if (!uid) { setUserTier(getDemoTierClient() ?? "FREE"); return; } // demo/ukázka
      // Úroveň členství (kvůli zamykání lekcí)
      supabase
        .from("profiles")
        .select("tier")
        .eq("id", uid)
        .maybeSingle()
        .then(({ data: p }) => setUserTier(normalizeTier(p?.tier as string | undefined)));
      const { data: rows } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed, note")
        .eq("course_slug", courseSlug);
      if (rows) {
        const map: Record<string, ProgressRow> = {};
        for (const r of rows as { lesson_id: string; completed: boolean; note: string | null }[]) {
          map[r.lesson_id] = { completed: r.completed, note: r.note ?? "" };
        }
        setProgress(map);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSlug]);

  async function save(lessonId: string, row: ProgressRow) {
    if (!userId) return;
    await supabase.from("lesson_progress").upsert(
      {
        user_id: userId,
        course_slug: courseSlug,
        lesson_id: lessonId,
        completed: row.completed,
        note: row.note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,course_slug,lesson_id" }
    );
  }

  function toggleCompleted(lessonId: string) {
    if (!userId) return;
    const current = progress[lessonId] ?? { completed: false, note: "" };
    const next = { ...current, completed: !current.completed };
    setProgress((p) => ({ ...p, [lessonId]: next }));
    save(lessonId, next);
  }

  function changeNote(lessonId: string, text: string) {
    const current = progress[lessonId] ?? { completed: false, note: "" };
    const next = { ...current, note: text };
    setProgress((p) => ({ ...p, [lessonId]: next }));
    // autosave s prodlevou
    clearTimeout(noteTimers.current[lessonId]);
    noteTimers.current[lessonId] = setTimeout(() => {
      save(lessonId, next);
      setSavedFlash(lessonId);
      setTimeout(() => setSavedFlash((f) => (f === lessonId ? null : f)), 1500);
    }, 700);
  }

  const loggedIn = !checking && userId;

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold text-brand-dark">
          Obsah kurzu ({lessons.length} lekcí · {formatDuration(totalDuration)})
        </h2>
        {loggedIn && (
          <span className="text-sm font-semibold text-brand-blue">
            {doneCount} / {lessons.length} hotovo
          </span>
        )}
      </div>

      {/* Progress bar (jen pro přihlášené) */}
      {loggedIn && (
        <div className="mb-5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-blue transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            {pct === 100 ? "Hotovo! Skvělá práce. 🎉" : `Splněno ${pct} %`}
          </p>
        </div>
      )}

      {/* Výzva k přihlášení */}
      {!checking && !userId && (
        <div className="mb-5 rounded-xl border border-brand-light bg-brand-light/60 p-4 text-sm text-brand-dark">
          <Link href="/ucet" className="font-semibold text-brand-blue hover:underline">
            Přihlas se
          </Link>{" "}
          a můžeš si odškrtávat hotové lekce a psát si k nim vlastní poznámky.
        </div>
      )}

      <ul className="space-y-1">
        {lessons.map((lesson) => {
          const row = progress[lesson.id];
          const done = row?.completed ?? false;
          const noteOpen = openNote === lesson.id;
          const hasNote = (row?.note ?? "").trim().length > 0;
          const locked = !canAccess(userTier, lesson.accessLevel);
          return (
            <li key={lesson.id} className="border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3 py-3">
                {/* Zámek / zaškrtnutí / pořadí */}
                {locked ? (
                  <span
                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-400"
                    aria-label="Zamčená lekce"
                  >
                    <Lock className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                ) : loggedIn ? (
                  <button
                    type="button"
                    onClick={() => toggleCompleted(lesson.id)}
                    aria-label={done ? "Označit jako nesplněné" : "Označit jako splněné"}
                    className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
                      done
                        ? "border-brand-blue bg-brand-blue text-white"
                        : "border-gray-300 text-transparent hover:border-brand-blue"
                    }`}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </button>
                ) : (
                  <span className="shrink-0 w-7 h-7 rounded-full bg-brand-light text-brand-blue text-xs font-bold flex items-center justify-center">
                    {lesson.order}
                  </span>
                )}

                <span
                  className={`flex-1 text-sm font-medium ${
                    locked ? "text-gray-400" : done ? "text-gray-400 line-through" : "text-brand-dark"
                  }`}
                >
                  {lesson.title}
                </span>

                <span className="text-xs text-gray-400 shrink-0">
                  {formatDuration(lesson.durationSeconds)}
                </span>

                {/* Tlačítko poznámky (jen u odemčených lekcí) */}
                {loggedIn && !locked && (
                  <button
                    type="button"
                    onClick={() => setOpenNote(noteOpen ? null : lesson.id)}
                    aria-label="Poznámky k lekci"
                    className={`shrink-0 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                      hasNote || noteOpen
                        ? "bg-brand-light text-brand-blue"
                        : "text-gray-400 hover:text-brand-blue"
                    }`}
                  >
                    <StickyNote className="h-3.5 w-3.5" strokeWidth={2} />
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${noteOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                )}

                {locked ? (
                  <Link href="/clenstvi" aria-label={`Odemknout úroveň ${lesson.accessLevel}`}>
                    <LockBadge level={lesson.accessLevel} />
                  </Link>
                ) : (
                  <AccessBadge level={lesson.accessLevel} />
                )}
              </div>

              {/* Poznámky */}
              {loggedIn && !locked && noteOpen && (
                <div className="pb-4 pl-10 pr-1">
                  <textarea
                    value={row?.note ?? ""}
                    onChange={(e) => changeNote(lesson.id, e.target.value)}
                    rows={3}
                    placeholder="Moje poznámky k této lekci… (ukládá se samo)"
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                  <p className="mt-1 h-4 text-xs text-gray-400">
                    {savedFlash === lesson.id ? "Uloženo ✓" : "Soukromé – vidíš jen ty."}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {freeLessons > 0 && (
        <p className="mt-4 text-xs text-gray-400">
          {freeLessons} {freeLessons === 1 ? "lekce je" : "lekce jsou"} zdarma – vyzkoušej před koupí.
        </p>
      )}
    </div>
  );
}
