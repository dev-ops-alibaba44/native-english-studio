-- =====================================================================
-- Batch 13, step 2 of 2 — agency billing-notes columns + RLS.
--
-- RUN THIS ONLY AFTER batch13a_add_roles.sql has already been run
-- successfully (as its own separate "Run" — see that file for why).
--
-- Two new roles this grants access for:
--   - super_admin — Dan's own account (classroom1@nativeenglish.ca).
--     Read-only across almost everything in the app (every agency, every
--     student's applications/drafts/comments/grades/activities/AI usage),
--     PLUS the ability to edit a small set of manually-tracked billing
--     fields on `agencies` (annual_fee_usd, plan_status, plan_notes) as a
--     stop-gap until Stripe is actually connected. Deliberately NO write
--     access to anything a student/advisor/agency owns (applications,
--     drafts, comments, grades, etc.) — Dan asked explicitly to be able
--     to view but never edit a student's own work, for privacy reasons.
--   - marketing — the future hire's lighter account. Read + status-update
--     access to the three lead tables only (agency_inquiries,
--     waitlist_signups, chatbot_messages). Nothing else — no student
--     data, no billing, no agency list.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Manual billing-tracking columns on agencies — stop-gap until Stripe.
-- Dan can hand-enter what an agency is actually paying and its status
-- today; once Stripe is wired in (separate, later batch), these can
-- either stay as Dan's own notes or be replaced by live Stripe data.
-- ---------------------------------------------------------------------
alter table public.agencies
  add column if not exists plan_status text not null default 'active'
    check (plan_status in ('trial', 'active', 'past_due', 'cancelled')),
  add column if not exists annual_fee_usd numeric,
  add column if not exists plan_notes text;

-- ---------------------------------------------------------------------
-- super_admin: read-only across the app.
-- ---------------------------------------------------------------------
create policy "super_admin reads all profiles" on public.profiles
  for select using (public.current_user_role() = 'super_admin');

create policy "super_admin reads all agencies" on public.agencies
  for select using (public.current_user_role() = 'super_admin');
create policy "super_admin updates agency billing notes" on public.agencies
  for update using (public.current_user_role() = 'super_admin');

create policy "super_admin reads all applications" on public.applications
  for select using (public.current_user_role() = 'super_admin');
create policy "super_admin reads all application_sections" on public.application_sections
  for select using (public.current_user_role() = 'super_admin');
create policy "super_admin reads all drafts" on public.drafts
  for select using (public.current_user_role() = 'super_admin');
create policy "super_admin reads all comments" on public.comments
  for select using (public.current_user_role() = 'super_admin');
create policy "super_admin reads all qa_messages" on public.qa_messages
  for select using (public.current_user_role() = 'super_admin');
create policy "super_admin reads all achievements" on public.achievements
  for select using (public.current_user_role() = 'super_admin');

create policy "super_admin reads all student_grades" on public.student_grades
  for select using (public.current_user_role() = 'super_admin');
create policy "super_admin reads all student_test_scores" on public.student_test_scores
  for select using (public.current_user_role() = 'super_admin');
create policy "super_admin reads all student_activities" on public.student_activities
  for select using (public.current_user_role() = 'super_admin');
create policy "super_admin reads all student_academic_config" on public.student_academic_config
  for select using (public.current_user_role() = 'super_admin');

create policy "super_admin reads all brainstorm_sessions" on public.brainstorm_sessions
  for select using (public.current_user_role() = 'super_admin');
create policy "super_admin reads all brainstorm_answers" on public.brainstorm_answers
  for select using (public.current_user_role() = 'super_admin');
create policy "super_admin reads all brainstorm_usage_log" on public.brainstorm_usage_log
  for select using (public.current_user_role() = 'super_admin');
create policy "super_admin reads all ai_feedback_log" on public.ai_feedback_log
  for select using (public.current_user_role() = 'super_admin');
create policy "super_admin reads all profile_assessments" on public.profile_assessments
  for select using (public.current_user_role() = 'super_admin');
create policy "super_admin reads all profile_assessment_log" on public.profile_assessment_log
  for select using (public.current_user_role() = 'super_admin');

create policy "super_admin reads all billing_events" on public.billing_events
  for select using (public.current_user_role() = 'super_admin');

-- ---------------------------------------------------------------------
-- super_admin AND marketing: read + status-update on the three public
-- lead tables (agency_inquiries, waitlist_signups, chatbot_messages).
-- These tables previously had insert-only policies for anon visitors
-- (batch10/batch11) and NO select policy at all — this adds the first
-- way for anyone inside the company to actually read them back.
-- ---------------------------------------------------------------------
create policy "internal roles read agency_inquiries" on public.agency_inquiries
  for select using (public.current_user_role() in ('super_admin', 'marketing'));
create policy "internal roles update agency_inquiries status" on public.agency_inquiries
  for update using (public.current_user_role() in ('super_admin', 'marketing'));

create policy "internal roles read waitlist_signups" on public.waitlist_signups
  for select using (public.current_user_role() in ('super_admin', 'marketing'));
create policy "internal roles update waitlist_signups status" on public.waitlist_signups
  for update using (public.current_user_role() in ('super_admin', 'marketing'));

create policy "internal roles read chatbot_messages" on public.chatbot_messages
  for select using (public.current_user_role() in ('super_admin', 'marketing'));

-- =====================================================================
-- After running both files, create Dan's super-admin account:
--   1. Supabase Dashboard → Authentication → Users → Add user →
--      classroom1@nativeenglish.ca, set a password (same as every other
--      test account so far — hand-created, not through the sign-up form).
--   2. Then run, in the SQL editor:
--        update public.profiles set role = 'super_admin', display_name = 'Dan'
--        where id = (select id from auth.users where email = 'classroom1@nativeenglish.ca');
--   3. When you hire the marketing person, same pattern with role = 'marketing'.
-- =====================================================================
