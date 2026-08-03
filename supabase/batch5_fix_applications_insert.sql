-- =====================================================================
-- Native English Studio — fix: students couldn't create applications
--
-- The root cause: Batch 2's schema gave students permission to READ and
-- UPDATE their own applications, but never actually granted permission
-- to CREATE one. Postgres denies by default when no rule allows an
-- action — that's the exact "new row violates row-level security
-- policy" error you saw. Safe to run on your existing database.
-- =====================================================================

drop policy if exists "applications: student creates own" on public.applications;

create policy "applications: student creates own" on public.applications
  for insert with check (student_id = auth.uid());

-- While we're here: advisors should also be able to create an
-- application on behalf of one of their own students (useful later,
-- e.g. if an advisor sets up a school for a student who hasn't gotten
-- to it yet). Costs nothing to add now.
drop policy if exists "applications: advisor creates for their students" on public.applications;

create policy "applications: advisor creates for their students" on public.applications
  for insert with check (
    student_id in (select id from public.profiles where primary_advisor_id = auth.uid())
  );
