-- Batch 9.10: monthly AI essay-feedback cap, pooled across a student's
-- applications (not per-essay) — same spirit as the brainstorming daily
-- cap (Batch 9.9), applied here to the 🤖 AI 回饋 button instead.
-- Run this in the Supabase SQL editor. Safe to run on your existing
-- database (adds one nullable column + backfills it).

-- ai_feedback_log already records every AI feedback request
-- (application_id, requested_by, tokens, created_at) but not who the
-- ESSAY belongs to — only who clicked the button, which can be the
-- student, their advisor, or an agency admin. The cap needs to be
-- attributed to the essay's owner regardless of who triggered the call,
-- so we add student_id directly (denormalized on write, going forward)
-- rather than joining through applications on every quota check.
alter table public.ai_feedback_log
  add column if not exists student_id uuid references public.profiles(id) on delete cascade;

update public.ai_feedback_log l
set student_id = a.student_id
from public.applications a
where l.application_id = a.id
  and l.student_id is null;

create index if not exists ai_feedback_log_student_id_created_at_idx
  on public.ai_feedback_log (student_id, created_at);
