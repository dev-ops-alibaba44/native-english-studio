-- =====================================================================
-- Native English Studio — fix for "infinite recursion detected in
-- policy for relation profiles"
--
-- What this does: creates two small helper functions that are allowed
-- to look up a person's own role/agency directly (bypassing the normal
-- security rules just for this one lookup), then re-points the one
-- policy that was causing the recursion to use them instead of
-- querying the profiles table directly from within its own policy.
--
-- Safe to run this once. If you run it a second time, it will just
-- replace the same function/policy again with no harm.
-- =====================================================================

-- Helper function 1: "what role does the currently logged-in person have?"
create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Helper function 2: "what agency does the currently logged-in person belong to?"
create or replace function public.current_user_agency_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select agency_id from public.profiles where id = auth.uid();
$$;

-- Now fix the one policy that was causing the recursion.
drop policy if exists "profiles: agency admin reads their agency" on public.profiles;

create policy "profiles: agency admin reads their agency" on public.profiles
  for select using (
    public.current_user_role() = 'agency_admin'
    and agency_id = public.current_user_agency_id()
  );
