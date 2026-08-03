-- Batch 7: let agency_admin adjust an advisor's capacity from inside the app.
--
-- Before this patch, the only way to change an advisor's caseload limit was
-- editing the `profiles.capacity` column directly in Supabase — which agency
-- admins (correctly) don't have access to. This adds a narrowly-scoped RLS
-- policy: agency_admin can update profiles, but only rows that are (a) in
-- their own agency and (b) already role='advisor', and the WITH CHECK clause
-- requires the row to still be role='advisor' in the same agency afterwards
-- (so this can't be used to promote/move accounts around — the app itself
-- also only ever sends {capacity: <number>} in the update).
--
-- Run this in the Supabase SQL editor.

drop policy if exists "profiles: agency admin updates advisor capacity" on public.profiles;
create policy "profiles: agency admin updates advisor capacity" on public.profiles
  for update using (
    public.current_user_role() = 'agency_admin'
    and role = 'advisor'
    and agency_id = public.current_user_agency_id()
  )
  with check (
    role = 'advisor'
    and agency_id = public.current_user_agency_id()
  );
