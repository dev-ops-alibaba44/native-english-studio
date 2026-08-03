-- Batch 9: allow advisor + agency_admin to save a document snapshot too.
--
-- Until now only the student could INSERT into `drafts` (it was the "submit
-- my draft" button). Now that editing is collaborative (Liveblocks), anyone
-- in the room — student, their advisor, or their agency admin — should be
-- able to save a snapshot for the history/word-count view. This mirrors the
-- existing read policies (see batch8_annotations.sql, batch7 patches).
--
-- Run this in the Supabase SQL editor.

drop policy if exists "drafts: advisor inserts for their students" on public.drafts;
create policy "drafts: advisor inserts for their students" on public.drafts
  for insert with check (
    author_id = auth.uid()
    and application_id in (
      select id from public.applications
      where student_id in (select id from public.profiles where primary_advisor_id = auth.uid())
    )
  );

drop policy if exists "drafts: agency admin inserts agency-wide" on public.drafts;
create policy "drafts: agency admin inserts agency-wide" on public.drafts
  for insert with check (
    author_id = auth.uid()
    and public.current_user_role() = 'agency_admin'
    and application_id in (
      select a.id from public.applications a
      join public.profiles p on p.id = a.student_id
      where p.agency_id = public.current_user_agency_id()
    )
  );
