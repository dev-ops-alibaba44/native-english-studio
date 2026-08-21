-- Batch 26: multiple advisors per student (up to 3), replacing the old
-- one-advisor-only model. profiles.primary_advisor_id is left in place
-- (untouched, not backfilled, not dropped) rather than migrated away
-- from — it was never consistently used as the single source of truth
-- to begin with (the advisor-facing student list already showed every
-- agency student regardless of primary_advisor_id, per Batch 9.8), and
-- leaving it alone avoids a data-migration decision this SQL file
-- shouldn't be making silently. The app's assignment UI and caseload
-- math now both read/write student_advisors exclusively.
-- Run in Supabase SQL editor. Safe to run once (uses if not exists).

create table if not exists public.student_advisors (
  student_id uuid not null references public.profiles(id) on delete cascade,
  advisor_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, advisor_id)
);

create index if not exists student_advisors_advisor_id_idx on public.student_advisors(advisor_id);

-- Enforced here, not just in the app, since this table could in
-- principle be written from more than one place over time.
create or replace function public.check_max_three_advisors()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.student_advisors where student_id = new.student_id) >= 3 then
    raise exception 'A student cannot have more than 3 advisors assigned.';
  end if;
  return new;
end;
$$;

drop trigger if exists student_advisors_max_three on public.student_advisors;
create trigger student_advisors_max_three
  before insert on public.student_advisors
  for each row execute function public.check_max_three_advisors();

alter table public.student_advisors enable row level security;

-- Same shape as the existing profiles policies (supabase/schema.sql):
-- agency_admin sees/manages everything in their own agency; an advisor
-- can see which students they're personally assigned to; a student can
-- see who their own advisors are.
create policy "student_advisors: agency admin manages their agency" on public.student_advisors
  for all using (
    public.current_user_role() = 'agency_admin'
    and student_id in (
      select id from public.profiles where agency_id = public.current_user_agency_id()
    )
  );

create policy "student_advisors: advisor reads their own assignments" on public.student_advisors
  for select using (advisor_id = auth.uid());

create policy "student_advisors: student reads their own advisors" on public.student_advisors
  for select using (student_id = auth.uid());
