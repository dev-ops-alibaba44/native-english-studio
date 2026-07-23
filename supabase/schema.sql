-- =====================================================================
-- Native English Studio — Batch 2 database schema
-- Run this in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run
-- Safe to run once on a fresh project. Re-running will error on things
-- that already exist (tables/policies) — that's expected, not a bug.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Agencies
-- ---------------------------------------------------------------------
create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Profiles — one row per person (student, advisor, or agency admin),
--    extending Supabase's built-in auth.users.
-- ---------------------------------------------------------------------
create type public.user_role as enum ('student', 'advisor', 'agency_admin');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'student',
  display_name text not null default '',
  agency_id uuid references public.agencies(id) on delete set null,
  -- for students only: their assigned advisor
  primary_advisor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up via Supabase Auth.
-- New users default to role='student' with no agency — an agency_admin
-- will assign them properly. (A proper invite flow is a later batch.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. Schools — shared per agency (deadlines/prompts entered once,
--    used across every student applying to that school).
-- ---------------------------------------------------------------------
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Applications — one row per (student, school). Holds the essay
--    prompt/word-limit directly for MVP simplicity; split into a
--    separate "essays" table later if a school ever needs >1 essay.
-- ---------------------------------------------------------------------
create type public.application_stage as enum (
  'brainstorm', 'outline', 'draft', 'advisor_feedback', 'revision', 'final'
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  prompt_text text not null default '',
  word_limit int,
  deadline date,
  stage public.application_stage not null default 'brainstorm',
  created_at timestamptz not null default now(),
  unique (student_id, school_id)
);

-- ---------------------------------------------------------------------
-- 5. Drafts — versioned essay text per application.
-- ---------------------------------------------------------------------
create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  version int not null default 1,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. Comments — advisor feedback anchored to a draft.
-- ---------------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  anchor_text text,
  body text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. Q&A messages — student <-> advisor, not tied to one draft.
-- ---------------------------------------------------------------------
create table if not exists public.qa_messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 8. Achievements — the student profile builder (awards, ECs, work, skills).
-- ---------------------------------------------------------------------
create type public.achievement_category as enum ('award', 'extracurricular', 'work', 'skill');

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  category public.achievement_category not null,
  title text not null,
  subtitle text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 9. Parent links — magic-link tokens for read-only parent access.
--    Parents never get a Supabase auth account; a later batch will add
--    a server route that validates this token with the service-role
--    key and returns read-only data, deliberately bypassing RLS below.
-- ---------------------------------------------------------------------
create table if not exists public.parent_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.agencies enable row level security;
alter table public.profiles enable row level security;
alter table public.schools enable row level security;
alter table public.applications enable row level security;
alter table public.drafts enable row level security;
alter table public.comments enable row level security;
alter table public.qa_messages enable row level security;
alter table public.achievements enable row level security;
alter table public.parent_links enable row level security;

-- ---- profiles ----
create policy "profiles: read own row" on public.profiles
  for select using (id = auth.uid());

create policy "profiles: agency admin reads their agency" on public.profiles
  for select using (
    agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'agency_admin')
  );

create policy "profiles: advisor reads their students" on public.profiles
  for select using (
    primary_advisor_id = auth.uid()
  );

create policy "profiles: update own row" on public.profiles
  for update using (id = auth.uid());

-- ---- agencies ----
create policy "agencies: members read their own agency" on public.agencies
  for select using (
    id in (select agency_id from public.profiles where id = auth.uid())
  );

-- ---- schools ----
create policy "schools: agency members read" on public.schools
  for select using (
    agency_id in (select agency_id from public.profiles where id = auth.uid())
  );

create policy "schools: advisor/admin write" on public.schools
  for insert with check (
    agency_id in (select agency_id from public.profiles where id = auth.uid() and role in ('advisor','agency_admin'))
  );

-- ---- applications ----
create policy "applications: student reads own" on public.applications
  for select using (student_id = auth.uid());

create policy "applications: advisor reads their students'" on public.applications
  for select using (
    student_id in (select id from public.profiles where primary_advisor_id = auth.uid())
  );

create policy "applications: agency admin reads agency-wide" on public.applications
  for select using (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'agency_admin')
    )
  );

create policy "applications: student updates own" on public.applications
  for update using (student_id = auth.uid());

create policy "applications: advisor updates their students'" on public.applications
  for update using (
    student_id in (select id from public.profiles where primary_advisor_id = auth.uid())
  );

-- ---- drafts ----
create policy "drafts: student reads own applications' drafts" on public.drafts
  for select using (
    application_id in (select id from public.applications where student_id = auth.uid())
  );

create policy "drafts: advisor reads their students' drafts" on public.drafts
  for select using (
    application_id in (
      select id from public.applications
      where student_id in (select id from public.profiles where primary_advisor_id = auth.uid())
    )
  );

create policy "drafts: student inserts own" on public.drafts
  for insert with check (
    author_id = auth.uid()
    and application_id in (select id from public.applications where student_id = auth.uid())
  );

-- ---- comments ----
create policy "comments: visible to student + advisor on that draft" on public.comments
  for select using (
    draft_id in (
      select d.id from public.drafts d
      join public.applications a on a.id = d.application_id
      where a.student_id = auth.uid()
         or a.student_id in (select id from public.profiles where primary_advisor_id = auth.uid())
    )
  );

create policy "comments: advisor inserts on their students' drafts" on public.comments
  for insert with check (
    author_id = auth.uid()
    and draft_id in (
      select d.id from public.drafts d
      join public.applications a on a.id = d.application_id
      where a.student_id in (select id from public.profiles where primary_advisor_id = auth.uid())
    )
  );

-- ---- qa_messages ----
create policy "qa: visible to the student + their advisor" on public.qa_messages
  for select using (
    student_id = auth.uid()
    or student_id in (select id from public.profiles where primary_advisor_id = auth.uid())
  );

create policy "qa: student or advisor can post" on public.qa_messages
  for insert with check (
    author_id = auth.uid()
    and (student_id = auth.uid() or student_id in (select id from public.profiles where primary_advisor_id = auth.uid()))
  );

-- ---- achievements ----
create policy "achievements: student manages own" on public.achievements
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "achievements: advisor reads their students'" on public.achievements
  for select using (
    student_id in (select id from public.profiles where primary_advisor_id = auth.uid())
  );

-- ---- parent_links ----
-- Intentionally no policies granting broad read access here — parent_links
-- is only ever read via a server route using the service-role key
-- (which bypasses RLS entirely), added in a later batch.
create policy "parent_links: student manages own" on public.parent_links
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
