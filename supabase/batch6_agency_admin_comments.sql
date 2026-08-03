-- Batch 6 patch: let agency_admin view drafts/comments agency-wide, and post comments.
--
-- Before this patch, agency_admin had no SELECT policy on drafts or comments at all —
-- meaning the "read access works via RLS" note in a previous handoff was optimistic;
-- an admin opening an application's draft content would have silently gotten nothing.
-- This adds the missing read policies plus a scoped insert policy for comments.
--
-- Run this in the Supabase SQL editor (or via `supabase db execute`) against your
-- existing project. Safe to run multiple times (drops + recreates each policy).

drop policy if exists "drafts: agency admin reads agency-wide" on public.drafts;
create policy "drafts: agency admin reads agency-wide" on public.drafts
  for select using (
    application_id in (
      select a.id from public.applications a
      join public.profiles p on p.id = a.student_id
      where p.agency_id = public.current_user_agency_id()
        and public.current_user_role() = 'agency_admin'
    )
  );

drop policy if exists "comments: agency admin reads agency-wide" on public.comments;
create policy "comments: agency admin reads agency-wide" on public.comments
  for select using (
    draft_id in (
      select d.id from public.drafts d
      join public.applications a on a.id = d.application_id
      join public.profiles p on p.id = a.student_id
      where p.agency_id = public.current_user_agency_id()
        and public.current_user_role() = 'agency_admin'
    )
  );

drop policy if exists "comments: agency admin inserts agency-wide" on public.comments;
create policy "comments: agency admin inserts agency-wide" on public.comments
  for insert with check (
    author_id = auth.uid()
    and public.current_user_role() = 'agency_admin'
    and draft_id in (
      select d.id from public.drafts d
      join public.applications a on a.id = d.application_id
      join public.profiles p on p.id = a.student_id
      where p.agency_id = public.current_user_agency_id()
    )
  );
