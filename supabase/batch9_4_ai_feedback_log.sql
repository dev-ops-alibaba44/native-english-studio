-- Batch 9.4: AI essay feedback usage log.
-- Run this in the Supabase SQL editor.
--
-- This deliberately does NOT implement credits/limits yet — it's just a
-- record of every AI feedback request, so we can look at real usage
-- patterns before designing the tier/credit system discussed earlier.

create table if not exists public.ai_feedback_log (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  model text not null,
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now()
);

alter table public.ai_feedback_log enable row level security;

-- Same access shape as everywhere else: student sees their own
-- applications' log, advisor sees their students', agency admin sees
-- agency-wide.
drop policy if exists "ai_feedback_log: student reads own" on public.ai_feedback_log;
create policy "ai_feedback_log: student reads own" on public.ai_feedback_log
  for select using (
    application_id in (select id from public.applications where student_id = auth.uid())
  );

drop policy if exists "ai_feedback_log: advisor reads their students'" on public.ai_feedback_log;
create policy "ai_feedback_log: advisor reads their students'" on public.ai_feedback_log
  for select using (
    application_id in (
      select id from public.applications
      where student_id in (select id from public.profiles where primary_advisor_id = auth.uid())
    )
  );

drop policy if exists "ai_feedback_log: agency admin reads agency-wide" on public.ai_feedback_log;
create policy "ai_feedback_log: agency admin reads agency-wide" on public.ai_feedback_log
  for select using (
    application_id in (
      select a.id from public.applications a
      join public.profiles p on p.id = a.student_id
      where p.agency_id = public.current_user_agency_id()
        and public.current_user_role() = 'agency_admin'
    )
  );

-- Inserts happen server-side via the service-role client (same pattern as
-- the Stripe webhook) since the request is triggered by a button click,
-- not a form the RLS-scoped user client would submit directly — this
-- keeps token-count bookkeeping tamper-proof from the client's perspective.
