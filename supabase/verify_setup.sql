-- =====================================================================
-- Native English Studio — verify your database setup
-- This script only READS data. It cannot break, delete, or change
-- anything — completely safe to run any time you want a sanity check.
-- =====================================================================

-- 1. Confirms all 9 core tables exist. You should see exactly 9 rows.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'agencies', 'profiles', 'schools', 'applications',
    'drafts', 'comments', 'qa_messages', 'achievements', 'parent_links'
  )
order by table_name;

-- 2. Shows every person you've created so far, with their role and
-- agency — useful any time you want to double check who's set up as
-- what, without digging through the Authentication tab.
select p.display_name, p.role, a.name as agency_name, u.email
from public.profiles p
left join public.agencies a on a.id = p.agency_id
join auth.users u on u.id = p.id
order by p.created_at;
