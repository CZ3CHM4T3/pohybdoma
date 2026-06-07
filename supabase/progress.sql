-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – POSTUP V KURZECH + POZNÁMKY
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

-- Jeden řádek = stav jedné lekce pro jednoho uživatele.
create table if not exists public.lesson_progress (
  user_id     uuid not null references auth.users (id) on delete cascade,
  course_slug text not null,
  lesson_id   text not null,
  completed   boolean not null default false,
  note        text,
  updated_at  timestamptz not null default now(),
  primary key (user_id, course_slug, lesson_id)
);

create index if not exists lesson_progress_user_course_idx
  on public.lesson_progress (user_id, course_slug);

alter table public.lesson_progress enable row level security;

grant select, insert, update, delete on public.lesson_progress to authenticated;

-- Každý vidí a edituje JEN své vlastní záznamy.
drop policy if exists "progress select" on public.lesson_progress;
create policy "progress select" on public.lesson_progress
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "progress insert" on public.lesson_progress;
create policy "progress insert" on public.lesson_progress
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "progress update" on public.lesson_progress;
create policy "progress update" on public.lesson_progress
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "progress delete" on public.lesson_progress;
create policy "progress delete" on public.lesson_progress
  for delete to authenticated using (auth.uid() = user_id);
