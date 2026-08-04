-- =====================================================================
-- Batch 9.8 — every advisor at an agency can access every student at
-- that agency (not just their own "primary" student), while
-- `primary_advisor_id` stays on the profile purely as a "who's the lead"
-- label for the UI, no longer used to gate access.
--
-- Run in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run on an existing database — only touches policies, no table
-- or column changes.
-- =====================================================================

-- ---- profiles ----
drop policy if exists "profiles: advisor reads their students" on public.profiles;
create policy "profiles: advisor reads agency profiles" on public.profiles
  for select using (
    public.current_user_role() = 'advisor'
    and agency_id = public.current_user_agency_id()
  );

-- ---- applications ----
drop policy if exists "applications: advisor reads their students'" on public.applications;
create policy "applications: advisor reads agency-wide" on public.applications
  for select using (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
    )
  );

drop policy if exists "applications: advisor updates their students'" on public.applications;
create policy "applications: advisor updates agency-wide" on public.applications
  for update using (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
    )
  );

drop policy if exists "applications: advisor creates for their students" on public.applications;
create policy "applications: advisor creates agency-wide" on public.applications
  for insert with check (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
    )
  );

-- ---- drafts ----
drop policy if exists "drafts: advisor reads their students' drafts" on public.drafts;
create policy "drafts: advisor reads agency-wide drafts" on public.drafts
  for select using (
    application_id in (
      select id from public.applications
      where student_id in (
        select id from public.profiles
        where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
      )
    )
  );

-- ---- comments (legacy table, superseded by Liveblocks — kept consistent anyway) ----
drop policy if exists "comments: visible to student + advisor on that draft" on public.comments;
create policy "comments: visible to student + agency advisors" on public.comments
  for select using (
    draft_id in (
      select d.id from public.drafts d
      join public.applications a on a.id = d.application_id
      where a.student_id = auth.uid()
         or a.student_id in (
           select id from public.profiles
           where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
         )
    )
  );

drop policy if exists "comments: advisor inserts on their students' drafts" on public.comments;
create policy "comments: advisor inserts agency-wide" on public.comments
  for insert with check (
    author_id = auth.uid()
    and draft_id in (
      select d.id from public.drafts d
      join public.applications a on a.id = d.application_id
      where a.student_id in (
        select id from public.profiles
        where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
      )
    )
  );

-- ---- qa_messages ----
drop policy if exists "qa: visible to the student + their advisor" on public.qa_messages;
create policy "qa: visible to the student + agency advisors" on public.qa_messages
  for select using (
    student_id = auth.uid()
    or student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
    )
  );

drop policy if exists "qa: student or advisor can post" on public.qa_messages;
create policy "qa: student or agency advisor can post" on public.qa_messages
  for insert with check (
    author_id = auth.uid()
    and (
      student_id = auth.uid()
      or student_id in (
        select id from public.profiles
        where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
      )
    )
  );

-- ---- achievements ----
drop policy if exists "achievements: advisor reads their students'" on public.achievements;
create policy "achievements: advisor reads agency-wide" on public.achievements
  for select using (
    student_id in (
      select id from public.profiles
      where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
    )
  );

-- ---- drafts: advisor inserts (added in batch9_liveblocks.sql) ----
drop policy if exists "drafts: advisor inserts for their students" on public.drafts;
create policy "drafts: advisor inserts agency-wide" on public.drafts
  for insert with check (
    author_id = auth.uid()
    and application_id in (
      select id from public.applications
      where student_id in (
        select id from public.profiles
        where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
      )
    )
  );

-- ---- application_sections (dead/unused feature per HANDOFF.md, added in
--      batch9_1_sections_and_agency_stage.sql — updated anyway for consistency
--      in case it's ever revisited) ----
drop policy if exists "sections: advisor reads their students'" on public.application_sections;
create policy "sections: advisor reads agency-wide" on public.application_sections
  for select using (
    application_id in (
      select id from public.applications
      where student_id in (
        select id from public.profiles
        where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
      )
    )
  );

drop policy if exists "sections: advisor inserts for their students'" on public.application_sections;
create policy "sections: advisor inserts agency-wide" on public.application_sections
  for insert with check (
    application_id in (
      select id from public.applications
      where student_id in (
        select id from public.profiles
        where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
      )
    )
  );

-- ---- ai_feedback_log (added in batch9_4_ai_feedback_log.sql) ----
drop policy if exists "ai_feedback_log: advisor reads their students'" on public.ai_feedback_log;
create policy "ai_feedback_log: advisor reads agency-wide" on public.ai_feedback_log
  for select using (
    application_id in (
      select id from public.applications
      where student_id in (
        select id from public.profiles
        where agency_id in (select agency_id from public.profiles where id = auth.uid() and role = 'advisor')
      )
    )
  );

-- Note: app/api/liveblocks-auth/route.ts and app/actions/ai-feedback.ts both
-- authorize by re-querying `applications` under the caller's own RLS context
-- (see their code comments) — they need no changes here, since the broadened
-- "applications: advisor reads agency-wide" policy above flows straight
-- through to both of them automatically.
