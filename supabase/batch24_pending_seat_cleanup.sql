-- Batch 24: safety net for the (rare, but real) case where a student's
-- Auth account and profile get created successfully but the seat that
-- was supposed to be assigned to them fails to attach — e.g. a race
-- where two agency staff pick the same seat at once, or a transient DB
-- error on the last step of app/actions/student-signup.ts.
-- Run in Supabase SQL editor. Safe to run once (uses if not exists).

alter table public.profiles
  add column if not exists pending_seat_deadline timestamptz;

comment on column public.profiles.pending_seat_deadline is
  'Set when a student account is created but seat assignment fails. '
  'If still set and in the past, app/api/cron/cleanup-pending-students '
  'deletes the account. Cleared the moment any seat gets assigned to '
  'this student (see app/actions/seats.ts assignSeat).';
