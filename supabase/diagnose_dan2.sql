-- =====================================================================
-- Native English Studio — check why "新增" silently did nothing
--
-- This almost always means the account has no agency_id set (the
-- student wasn't successfully linked to an agency). Run this to see
-- exactly what's on file for a given account.
-- =====================================================================

select
  u.email,
  p.display_name,
  p.role,
  p.agency_id,
  a.name as agency_name,
  p.primary_advisor_id
from public.profiles p
join auth.users u on u.id = p.id
left join public.agencies a on a.id = p.agency_id
where u.email = 'dan2@nativeenglish.ca';

-- If agency_id / agency_name come back blank (null), that confirms the
-- issue. Fix it by running the block below — it looks up your existing
-- test agency by the admin's display name, so you don't need to know
-- any IDs.

update public.profiles
set
  agency_id = (select agency_id from public.profiles where display_name = '測試管理者' limit 1),
  primary_advisor_id = (select id from public.profiles where display_name = '測試顧問' limit 1),
  display_name = '測試學生'
where id = (select id from auth.users where email = 'dan2@nativeenglish.ca');

-- Re-run the first query above (or this one) to confirm it's fixed:
select
  u.email,
  p.display_name,
  p.role,
  p.agency_id,
  a.name as agency_name
from public.profiles p
join auth.users u on u.id = p.id
left join public.agencies a on a.id = p.agency_id
where u.email = 'dan2@nativeenglish.ca';
