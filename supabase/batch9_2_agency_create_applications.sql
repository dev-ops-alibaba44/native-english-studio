-- Batch 9.2: agency admin can create applications for their students too
-- (previously only the student themselves or their advisor could).
-- Run this in the Supabase SQL editor.

drop policy if exists "applications: agency admin creates agency-wide" on public.applications;
create policy "applications: agency admin creates agency-wide" on public.applications
  for insert with check (
    public.current_user_role() = 'agency_admin'
    and student_id in (
      select id from public.profiles where agency_id = public.current_user_agency_id()
    )
  );
