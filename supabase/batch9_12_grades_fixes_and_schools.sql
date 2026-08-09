-- =====================================================================
-- Batch 9.12 — Grades bug fixes (data model change) + Taiwan school
-- catalog.
--
-- PART 1: term_N_grade (single text column) -> term_N_grades (jsonb),
-- keyed by grading scale ('percentage' | 'letter' | 'gpa4'). Batch 9.11's
-- schema had exactly ONE value slot per term regardless of scale, so
-- switching a student's grading_scale didn't switch to a separate blank
-- slate the way it looked like it did — it just happened to *display* as
-- blank when the raw stored text didn't parse as a valid option for the
-- new scale's input type (a letter dropdown silently shows nothing for an
-- unmatched value), and displayed the RAW OLD NUMBER when switching to
-- GPA, because a number input's max attribute doesn't stop it from
-- rendering an out-of-range value that's already set. Switching scale was
-- silently overwriting, not actually separating, and would have destroyed
-- the old values for good on the next save. This migration makes "each
-- scale has its own storage" a real, correct feature instead of an
-- accidental side effect, and preserves every already-entered grade by
-- moving it into the jsonb under whichever scale the student's
-- student_academic_config says they were using at the time.
--
-- PART 2: taiwan_high_schools (which junior/senior high the student
-- attends) + school_courses (which courses have been used at which
-- school, for future autocomplete prioritization — "students from your
-- school added these").
--
-- Run in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run once; re-running is harmless (guarded with if not exists /
-- on conflict where it matters), but the term_N_grade -> term_N_grades
-- data migration below should only be run once — running it a second
-- time after you've already entered NEW grades under the new columns
-- would do nothing (the old columns will already be gone), so this is
-- naturally a one-time step, not resumable.
-- =====================================================================

-- ---- PART 1: grades storage ----

alter table public.student_grades add column if not exists term_1_grades jsonb not null default '{}'::jsonb;
alter table public.student_grades add column if not exists term_2_grades jsonb not null default '{}'::jsonb;
alter table public.student_grades add column if not exists term_3_grades jsonb not null default '{}'::jsonb;
alter table public.student_grades add column if not exists term_4_grades jsonb not null default '{}'::jsonb;

-- Migrate existing values (only runs meaningfully once — the old columns
-- this reads from are dropped at the end of this block).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'student_grades' and column_name = 'term_1_grade'
  ) then
    update public.student_grades sg set
      term_1_grades = case when sg.term_1_grade is not null and sg.term_1_grade <> ''
        then jsonb_build_object(coalesce((select grading_scale from public.student_academic_config where student_id = sg.student_id), 'percentage'), sg.term_1_grade)
        else '{}'::jsonb end,
      term_2_grades = case when sg.term_2_grade is not null and sg.term_2_grade <> ''
        then jsonb_build_object(coalesce((select grading_scale from public.student_academic_config where student_id = sg.student_id), 'percentage'), sg.term_2_grade)
        else '{}'::jsonb end,
      term_3_grades = case when sg.term_3_grade is not null and sg.term_3_grade <> ''
        then jsonb_build_object(coalesce((select grading_scale from public.student_academic_config where student_id = sg.student_id), 'percentage'), sg.term_3_grade)
        else '{}'::jsonb end,
      term_4_grades = case when sg.term_4_grade is not null and sg.term_4_grade <> ''
        then jsonb_build_object(coalesce((select grading_scale from public.student_academic_config where student_id = sg.student_id), 'percentage'), sg.term_4_grade)
        else '{}'::jsonb end;

    alter table public.student_grades drop column term_1_grade;
    alter table public.student_grades drop column term_2_grade;
    alter table public.student_grades drop column term_3_grade;
    alter table public.student_grades drop column term_4_grade;
  end if;
end $$;

-- ---- PART 2: Taiwan school catalog ----

create table if not exists public.taiwan_high_schools (
  id uuid primary key default gen_random_uuid(),
  name_zh text not null,
  name_en text,
  level text not null default 'senior' check (level in ('junior', 'senior', 'both')),
  school_type text check (school_type in ('public', 'private', 'international')),
  created_by uuid references public.profiles(id) on delete set null, -- null = seeded/standard entry
  created_at timestamptz not null default now(),
  unique (name_zh)
);

alter table public.student_academic_config
  add column if not exists school_id uuid references public.taiwan_high_schools(id) on delete set null;

-- Which courses have been used at which school — grown automatically as
-- students save grades (see app/actions/grades.ts), used to bias the
-- course autocomplete toward courses already known at the student's own
-- school.
create table if not exists public.school_courses (
  school_id uuid not null references public.taiwan_high_schools(id) on delete cascade,
  course_catalog_id uuid not null references public.course_catalog(id) on delete cascade,
  usage_count integer not null default 1,
  primary key (school_id, course_catalog_id)
);

create index if not exists taiwan_high_schools_name_zh_idx on public.taiwan_high_schools (name_zh text_pattern_ops);

alter table public.taiwan_high_schools enable row level security;
alter table public.school_courses enable row level security;

create policy "taiwan_high_schools: any signed-in user reads" on public.taiwan_high_schools
  for select using (auth.uid() is not null);

create policy "taiwan_high_schools: any signed-in user adds" on public.taiwan_high_schools
  for insert with check (auth.uid() is not null and created_by = auth.uid());

create policy "school_courses: any signed-in user reads" on public.school_courses
  for select using (auth.uid() is not null);

create policy "school_courses: any signed-in user writes" on public.school_courses
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Helper used by saveGradesForLevel() to record/bump a course's usage at
-- a given school in one atomic upsert.
create or replace function public.record_school_course_usage(p_school_id uuid, p_course_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.school_courses (school_id, course_catalog_id, usage_count)
  values (p_school_id, p_course_id, 1)
  on conflict (school_id, course_catalog_id)
  do update set usage_count = public.school_courses.usage_count + 1;
$$;

-- ---------------------------------------------------------------------
-- Starter taiwan_high_schools seed data — a recognizable set of
-- well-known public/private senior highs plus Taiwan's best-known
-- international schools. THIS IS NOT THE OFFICIAL MOE DIRECTORY and does
-- not cover all ~486 senior highs or ~700+ junior highs in Taiwan — see
-- the note in the batch write-up about getting the authoritative list
-- imported properly. Grows the same way courses do: "找不到就新增".
-- ---------------------------------------------------------------------
insert into public.taiwan_high_schools (name_zh, name_en, level, school_type) values
  ('國立臺灣師範大學附屬高級中學', 'National Taiwan Normal University Affiliated Senior High School', 'senior', 'public'),
  ('國立建國高級中學', 'Taipei Municipal Chien Kuo High School', 'senior', 'public'),
  ('臺北市立第一女子高級中學', 'Taipei First Girls High School', 'senior', 'public'),
  ('臺北市立中山女子高級中學', 'Taipei Municipal Zhongshan Girls High School', 'senior', 'public'),
  ('臺北市立成功高級中學', 'Taipei Municipal Chenggong High School', 'senior', 'public'),
  ('臺北市立復興高級中學', 'Taipei Municipal Fuxing High School', 'senior', 'public'),
  ('臺北市立大同高級中學', 'Taipei Municipal Datong High School', 'senior', 'public'),
  ('市立高雄高級中學', 'Kaohsiung Municipal Kaohsiung Senior High School', 'senior', 'public'),
  ('國立臺中第一高級中學', 'National Taichung First Senior High School', 'senior', 'public'),
  ('國立臺中女子高級中學', 'Taichung Girls Senior High School', 'senior', 'public'),
  ('國立新竹高級中學', 'National Hsinchu Senior High School', 'senior', 'public'),
  ('國立新竹女子高級中學', 'Hsinchu Girls Senior High School', 'senior', 'public'),
  ('國立臺南第一高級中學', 'Tainan First Senior High School', 'senior', 'public'),
  ('國立嘉義高級中學', 'National Chiayi Senior High School', 'senior', 'public'),
  ('私立延平高級中學', 'Yanping Senior High School', 'senior', 'private'),
  ('私立薇閣高級中學', 'Wego Senior High School', 'senior', 'private'),
  ('私立復興實驗高級中學', 'Fuhsing Private School', 'senior', 'private'),
  ('康橋國際學校', 'Kang Chiao International School', 'both', 'private'),
  ('臺北美國學校', 'Taipei American School', 'both', 'international'),
  ('臺北歐洲學校', 'Taipei European School', 'both', 'international'),
  ('陽明山美國學校', 'Grace Christian Academy', 'both', 'international'),
  ('馬禮遜美國學校', 'Morrison Academy', 'both', 'international'),
  ('道明外僑學校', 'Dominican International School', 'both', 'international'),
  ('奉元國際學校', 'Kaohsiung American School', 'both', 'international'),
  ('文藻外語附設高中', 'Wenzao Ursuline Senior High School', 'senior', 'private')
on conflict (name_zh) do nothing;
