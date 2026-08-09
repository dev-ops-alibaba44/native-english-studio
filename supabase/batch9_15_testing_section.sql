-- =====================================================================
-- Batch 9.15 — 測驗成績 (Testing) section: one table, one page, four
-- subsections (AP / language testing / admissions testing / other),
-- distinguished by `category` the same way student_activities is. Scores
-- are stored as text rather than a number — AP (1–5 integer), IELTS
-- (0–9 in half-point steps), TOEFL iBT (0–120), SAT (400–1600), ACT
-- (1–36), Duolingo (10–160) etc. don't share a single numeric shape, and
-- "other" exams could be anything. Duplicates are intentionally allowed
-- (no unique constraint) — retakes are the normal case, not an error.
-- =====================================================================

create table if not exists public.student_test_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('ap', 'language', 'admissions', 'other')),
  exam_name text not null,
  test_month integer check (test_month between 1 and 12),
  test_year integer check (test_year between 2000 and 2100),
  score text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_test_scores_student_category_idx
  on public.student_test_scores (student_id, category, sort_order);

alter table public.student_test_scores enable row level security;

create policy "student_test_scores: student manages own" on public.student_test_scores
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "student_test_scores: advisor manages agency-wide" on public.student_test_scores
  for all using (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
    )
  ) with check (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
    )
  );

create policy "student_test_scores: agency admin manages agency-wide" on public.student_test_scores
  for all using (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'agency_admin')
    )
  ) with check (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'agency_admin')
    )
  );
