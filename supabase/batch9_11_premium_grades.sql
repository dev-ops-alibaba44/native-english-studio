-- =====================================================================
-- Batch 9.11 — Premium tier, part 1: 成績 (Grades) sub-page.
--
-- Three tables:
-- 1. course_catalog — shared, bilingual (name_en/name_zh) list of course
--    names for the autocomplete-as-you-type search when adding a grade
--    row. Seeded below with a starting set covering Taiwan's 108課綱 core
--    subjects plus common AP/IB/A-Level titles — NOT an exhaustive or
--    authoritative curriculum database, just enough to make the "找不到
--    就新增" (can't find it, add it) flow feel populated from day one.
--    Every custom addition (created_by not null) grows this list for
--    everyone else going forward, per your instruction.
-- 2. student_academic_config — one row per student: how many terms their
--    school uses per year (2 = semesters, 3 = trimesters, 4 = quarters)
--    and which grading scale they enter grades in. Drives how many term
--    columns the Grades page renders.
-- 3. student_grades — one row per course the student took in grade 11 or
--    12, with up to 4 term-grade columns (only the ones that apply given
--    student_academic_config.terms_per_year are shown/used). Wide/
--    spreadsheet-shaped on purpose — it's a direct match for the
--    row-per-course, column-per-term UI this is meant to power, and
--    avoids a join against a separate long-format grades table just to
--    render one row per course.
--
-- Run in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- =====================================================================

create table if not exists public.course_catalog (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_zh text not null,
  curriculum text, -- e.g. 'TW-108', 'AP', 'IB', 'A-Level' — informational only, not enforced
  created_by uuid references public.profiles(id) on delete set null, -- null = seeded/standard entry
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (name_en, name_zh)
);

create table if not exists public.student_academic_config (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  terms_per_year integer not null default 2 check (terms_per_year between 1 and 4),
  grading_scale text not null default 'percentage' check (grading_scale in ('percentage', 'letter', 'gpa4')),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  grade_level integer not null check (grade_level in (11, 12)),
  course_name text not null,
  course_catalog_id uuid references public.course_catalog(id) on delete set null,
  term_1_grade text,
  term_2_grade text,
  term_3_grade text,
  term_4_grade text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_grades_student_id_idx on public.student_grades (student_id, grade_level, sort_order);
create index if not exists course_catalog_name_en_idx on public.course_catalog (lower(name_en) text_pattern_ops);
create index if not exists course_catalog_name_zh_idx on public.course_catalog (name_zh);

alter table public.course_catalog enable row level security;
alter table public.student_academic_config enable row level security;
alter table public.student_grades enable row level security;

-- ---- course_catalog ----
-- Shared reference data: every signed-in user can search/read it, and
-- add to it (the "找不到就新增" flow) — nobody can edit or delete an
-- existing entry, including their own, to keep this append-only and
-- avoid one person's typo clobbering an entry others are now using.
create policy "course_catalog: any signed-in user reads" on public.course_catalog
  for select using (auth.uid() is not null);

create policy "course_catalog: any signed-in user adds" on public.course_catalog
  for insert with check (auth.uid() is not null and created_by = auth.uid());

-- ---- student_academic_config ----
create policy "student_academic_config: student manages own" on public.student_academic_config
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "student_academic_config: advisor manages agency-wide" on public.student_academic_config
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

create policy "student_academic_config: agency admin manages agency-wide" on public.student_academic_config
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

-- ---- student_grades ----
create policy "student_grades: student manages own" on public.student_grades
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "student_grades: advisor manages agency-wide" on public.student_grades
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

create policy "student_grades: agency admin manages agency-wide" on public.student_grades
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

-- ---------------------------------------------------------------------
-- Starter course_catalog seed data. created_by left null (= standard/
-- seeded, not a user addition). Safe to re-run: the unique(name_en,
-- name_zh) constraint makes this idempotent.
-- ---------------------------------------------------------------------
insert into public.course_catalog (name_en, name_zh, curriculum) values
  ('Mandarin Chinese', '國語文', 'TW-108'),
  ('English', '英語文', 'TW-108'),
  ('Mathematics A', '數學A', 'TW-108'),
  ('Mathematics B', '數學B', 'TW-108'),
  ('Physics', '物理', 'TW-108'),
  ('Chemistry', '化學', 'TW-108'),
  ('Biology', '生物', 'TW-108'),
  ('Earth Science', '地球科學', 'TW-108'),
  ('History', '歷史', 'TW-108'),
  ('Geography', '地理', 'TW-108'),
  ('Civics and Society', '公民與社會', 'TW-108'),
  ('Physical Education', '體育', 'TW-108'),
  ('Music', '音樂', 'TW-108'),
  ('Fine Arts', '美術', 'TW-108'),
  ('Life Technology', '生活科技', 'TW-108'),
  ('Information Technology', '資訊科技', 'TW-108'),
  ('Health and Nursing', '健康與護理', 'TW-108'),
  ('Second Foreign Language — Japanese', '第二外語—日語', 'TW-108'),
  ('Second Foreign Language — French', '第二外語—法語', 'TW-108'),
  ('Second Foreign Language — Spanish', '第二外語—西班牙語', 'TW-108'),
  ('AP Calculus AB', 'AP 微積分 AB', 'AP'),
  ('AP Calculus BC', 'AP 微積分 BC', 'AP'),
  ('AP Statistics', 'AP 統計學', 'AP'),
  ('AP Physics 1', 'AP 物理 1', 'AP'),
  ('AP Physics 2', 'AP 物理 2', 'AP'),
  ('AP Physics C: Mechanics', 'AP 物理 C：力學', 'AP'),
  ('AP Chemistry', 'AP 化學', 'AP'),
  ('AP Biology', 'AP 生物', 'AP'),
  ('AP Computer Science A', 'AP 電腦科學 A', 'AP'),
  ('AP Computer Science Principles', 'AP 電腦科學原理', 'AP'),
  ('AP Microeconomics', 'AP 個體經濟學', 'AP'),
  ('AP Macroeconomics', 'AP 總體經濟學', 'AP'),
  ('AP Psychology', 'AP 心理學', 'AP'),
  ('AP English Language and Composition', 'AP 英語語言與寫作', 'AP'),
  ('AP English Literature and Composition', 'AP 英語文學與寫作', 'AP'),
  ('AP US History', 'AP 美國歷史', 'AP'),
  ('AP World History', 'AP 世界歷史', 'AP'),
  ('AP Human Geography', 'AP 人文地理', 'AP'),
  ('AP Studio Art', 'AP 藝術創作', 'AP'),
  ('IB Mathematics: Analysis and Approaches HL', 'IB 數學：分析與方法 HL', 'IB'),
  ('IB Mathematics: Applications and Interpretation SL', 'IB 數學：應用與詮釋 SL', 'IB'),
  ('IB Physics HL', 'IB 物理 HL', 'IB'),
  ('IB Chemistry HL', 'IB 化學 HL', 'IB'),
  ('IB Biology HL', 'IB 生物 HL', 'IB'),
  ('IB Economics SL', 'IB 經濟學 SL', 'IB'),
  ('IB English A: Language and Literature HL', 'IB 英語 A：語言與文學 HL', 'IB'),
  ('IB Theory of Knowledge', 'IB 知識理論', 'IB'),
  ('A-Level Mathematics', 'A-Level 數學', 'A-Level'),
  ('A-Level Further Mathematics', 'A-Level 進階數學', 'A-Level'),
  ('A-Level Physics', 'A-Level 物理', 'A-Level'),
  ('A-Level Chemistry', 'A-Level 化學', 'A-Level'),
  ('A-Level Biology', 'A-Level 生物', 'A-Level'),
  ('A-Level Economics', 'A-Level 經濟學', 'A-Level')
on conflict (name_en, name_zh) do nothing;

-- Small helper used by saveGradesForLevel() to bump a course's
-- usage_count (so more-commonly-picked courses surface first in the
-- autocomplete) without a read-then-write race between concurrent savers.
create or replace function public.increment_course_usage(course_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.course_catalog set usage_count = usage_count + 1 where id = course_id;
$$;
