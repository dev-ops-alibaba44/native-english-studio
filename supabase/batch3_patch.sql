-- =====================================================================
-- Native English Studio — Batch 3 patch
-- Safe to run on your existing database — this only ADDS one new
-- permission rule, it doesn't touch or recreate anything that exists.
-- =====================================================================

-- Batch 2 only allowed advisors/agency admins to add schools. Batch 3's
-- "新增申請" (add application) feature lets a student type in a school
-- name directly, so students need permission to create a school row too
-- (scoped to their own agency only).
drop policy if exists "schools: students can add for own agency" on public.schools;

create policy "schools: students can add for own agency" on public.schools
  for insert with check (
    agency_id = public.current_user_agency_id()
  );
