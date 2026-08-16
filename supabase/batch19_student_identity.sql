-- Batch 19: student identity fields (birthdate, Chinese name, legal
-- English name, preferred name), each with its own lock, per Dan.
-- Run in Supabase SQL editor. Safe to run once.

alter table public.profiles
  add column if not exists birthdate date,
  add column if not exists birthdate_locked boolean not null default false,
  add column if not exists chinese_name text,
  add column if not exists chinese_name_locked boolean not null default false,
  add column if not exists legal_first_name text,
  add column if not exists legal_first_name_locked boolean not null default false,
  add column if not exists legal_last_name text,
  add column if not exists legal_last_name_locked boolean not null default false,
  add column if not exists preferred_name text,
  -- null until the first time it's set — the monthly throttle only
  -- applies to CHANGES, so the first save is always allowed regardless
  -- of this column's initial state.
  add column if not exists preferred_name_changed_at timestamptz;

-- Rules, enforced in app/actions/student-identity.ts (server action —
-- these columns have no client-facing RLS write policy, only the normal
-- "student/advisor/agency reads own agency's students" read policies
-- already in place from earlier batches apply here):
--   - birthdate, chinese_name, legal_first_name, legal_last_name: each
--     can be set once for free, then locked forever. Editing a locked
--     field is rejected server-side even if someone bypasses the UI.
--   - preferred_name: no lock, but limited to one change per rolling
--     30 days (tracked via preferred_name_changed_at).
