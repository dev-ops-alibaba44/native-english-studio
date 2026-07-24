-- =====================================================================
-- Native English Studio — set up a student test account
--
-- Before running this: create a THIRD test login in Supabase
-- (Authentication -> Users -> Add user -> Create new user), the same
-- way you created your admin and advisor test accounts. Use "Auto
-- Confirm User" again. Then edit the email address below and run this.
-- =====================================================================

update public.profiles
set
  agency_id = (select agency_id from public.profiles where display_name = '測試管理者' limit 1),
  primary_advisor_id = (select id from public.profiles where display_name = '測試顧問' limit 1),
  display_name = '測試學生'
where id = (
  select id from auth.users where email = 'student@nativeenglish.ca' -- <-- change this to your third test email
);

-- Confirms it worked — you should see 測試學生 listed with role "student",
-- the same agency name as your admin/advisor, and an assigned advisor.
select p.display_name, p.role, a.name as agency_name, u.email
from public.profiles p
left join public.agencies a on a.id = p.agency_id
join auth.users u on u.id = p.id
order by p.created_at;
