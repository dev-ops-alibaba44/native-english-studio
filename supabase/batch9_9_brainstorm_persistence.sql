-- =====================================================================
-- Batch 9.9 — persistence + resource limits for the brainstorming tool.
--
-- 1. brainstorm_answers — one row per (student, starter question), the
--    small writing box under each prompt on /student/prompts. Student
--    writes/edits their own; advisor + agency admin read agency-wide
--    (same pattern as everything else since Batch 9.8).
-- 2. brainstorm_sessions — archived AI conversation transcripts. Saved
--    as a single static text blob on demand (the "封存對話" button),
--    NOT the live conversation itself — viewing an old session never
--    re-runs anything through the AI, it just reads this table.
-- 3. brainstorm_usage_log — one row per AI brainstorming call, used only
--    to enforce a daily per-user cap (see app/actions/brainstorm.ts).
--
-- Run in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- =====================================================================

create table if not exists public.brainstorm_answers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  question_key text not null,
  answer_text text not null default '',
  updated_at timestamptz not null default now(),
  unique (student_id, question_key)
);

create table if not exists public.brainstorm_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  transcript text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.brainstorm_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.brainstorm_answers enable row level security;
alter table public.brainstorm_sessions enable row level security;
alter table public.brainstorm_usage_log enable row level security;

-- ---- brainstorm_answers ----
create policy "brainstorm_answers: student manages own" on public.brainstorm_answers
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "brainstorm_answers: advisor reads agency-wide" on public.brainstorm_answers
  for select using (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
    )
  );

create policy "brainstorm_answers: agency admin reads agency-wide" on public.brainstorm_answers
  for select using (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'agency_admin')
    )
  );

-- ---- brainstorm_sessions ----
create policy "brainstorm_sessions: student manages own" on public.brainstorm_sessions
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "brainstorm_sessions: advisor archives/reads agency-wide" on public.brainstorm_sessions
  for all using (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
    )
  ) with check (
    author_id = auth.uid()
    and student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
    )
  );

create policy "brainstorm_sessions: agency admin archives/reads agency-wide" on public.brainstorm_sessions
  for all using (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'agency_admin')
    )
  ) with check (
    author_id = auth.uid()
    and student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'agency_admin')
    )
  );

-- ---- brainstorm_usage_log ----
-- Only ever read/written for the caller's own id (quota self-check) — no
-- agency-wide read needed, this table isn't user-facing content.
create policy "brainstorm_usage_log: manage own" on public.brainstorm_usage_log
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
