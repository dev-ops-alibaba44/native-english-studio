-- Batch 23: agency-initiated student sign-up.
-- Run in Supabase SQL editor. Safe to run once (uses if not exists).

-- Students created via the new /agency/students/new flow are created
-- through the Supabase Auth admin API (inviteUserByEmail), which stores
-- the email on auth.users, not on public.profiles. This mirror column
-- lets every page that already reads profiles (students list, the new
-- billing/students roster, etc.) show the student's email without a
-- second admin-API round trip per row. Populated going forward by
-- app/actions/student-signup.ts at creation time — existing profiles
-- created before this batch (e.g. the original self-signup accounts)
-- will show blank here until an agency admin fills it in some other way;
-- that's expected, not a bug.
alter table public.profiles
  add column if not exists email text;
