-- =====================================================================
-- Batch 9.16 — AI 綜合評估 (profile assessment): reads across a
-- student's grades, test scores, activities, and in-progress essays, and
-- produces improvement suggestions + school fit + Reach/Target/Likely
-- tiers (never a numeric admission percentage — see Dan's Batch 9.11
-- decision on this).
--
-- profile_assessments: saved results — generating a result and SAVING it
-- are two separate steps (same as essay AI 回饋 vs 封存, and brainstorm
-- chat vs 封存對話), so this only gets a row once the student/advisor/
-- agency admin explicitly clicks Save.
--
-- profile_assessment_log: usage log for a monthly cap, same shape as
-- ai_feedback_log but for this separate feature — generation is the
-- expensive step (it costs an AI call regardless of whether the result
-- gets saved afterward), so the cap is checked there, not on save.
-- =====================================================================

create table if not exists public.profile_assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_assessment_log (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  model text,
  input_tokens integer,
  output_tokens integer,
  cache_creation_tokens integer,
  cache_read_tokens integer,
  created_at timestamptz not null default now()
);

create index if not exists profile_assessments_student_id_idx on public.profile_assessments (student_id, created_at desc);
create index if not exists profile_assessment_log_student_id_idx on public.profile_assessment_log (student_id, created_at);

alter table public.profile_assessments enable row level security;
alter table public.profile_assessment_log enable row level security;

create policy "profile_assessments: student manages own" on public.profile_assessments
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "profile_assessments: advisor manages agency-wide" on public.profile_assessments
  for all using (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
    )
  ) with check (
    requested_by = auth.uid()
    and student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
    )
  );

create policy "profile_assessments: agency admin manages agency-wide" on public.profile_assessments
  for all using (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'agency_admin')
    )
  ) with check (
    requested_by = auth.uid()
    and student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'agency_admin')
    )
  );

-- profile_assessment_log: written only by the admin client (server-side
-- usage logging, same pattern as ai_feedback_log) — no direct end-user
-- policies needed beyond RLS being enabled.
