-- Batch 9.1: agency admin stage updates + application sections.
-- Run this in the Supabase SQL editor.

-- ---------------------------------------------------------------------
-- 1. Let agency_admin update applications (stage) agency-wide, mirroring
--    the existing read policy. Previously only the student (own) and
--    their advisor could update an application's stage.
-- ---------------------------------------------------------------------
drop policy if exists "applications: agency admin updates agency-wide" on public.applications;
create policy "applications: agency admin updates agency-wide" on public.applications
  for update using (
    public.current_user_role() = 'agency_admin'
    and student_id in (
      select id from public.profiles where agency_id = public.current_user_agency_id()
    )
  );

-- ---------------------------------------------------------------------
-- 2. application_sections — optional extra sections/prompts under one
--    application (e.g. NYU's "Why NYU?" supplement, or each of the
--    Common App's essay prompts). Each section is its own live document
--    (its own Liveblocks room: "application:<id>:section:<section_id>").
--    An application with no sections just shows its one main document,
--    same as before — sections are additive, never required.
-- ---------------------------------------------------------------------
create table if not exists public.application_sections (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  title text not null,
  prompt_text text,
  word_limit int,
  created_at timestamptz not null default now()
);

alter table public.application_sections enable row level security;

drop policy if exists "sections: student reads own applications'" on public.application_sections;
create policy "sections: student reads own applications'" on public.application_sections
  for select using (
    application_id in (select id from public.applications where student_id = auth.uid())
  );

drop policy if exists "sections: advisor reads their students'" on public.application_sections;
create policy "sections: advisor reads their students'" on public.application_sections
  for select using (
    application_id in (
      select id from public.applications
      where student_id in (select id from public.profiles where primary_advisor_id = auth.uid())
    )
  );

drop policy if exists "sections: agency admin reads agency-wide" on public.application_sections;
create policy "sections: agency admin reads agency-wide" on public.application_sections
  for select using (
    application_id in (
      select a.id from public.applications a
      join public.profiles p on p.id = a.student_id
      where p.agency_id = public.current_user_agency_id()
        and public.current_user_role() = 'agency_admin'
    )
  );

-- Any of the three roles can add a section — same spirit as collaborative
-- editing itself: student, advisor, or agency admin might all reasonably
-- notice "oh, this school also wants a supplemental essay" and add it.
drop policy if exists "sections: student inserts own applications'" on public.application_sections;
create policy "sections: student inserts own applications'" on public.application_sections
  for insert with check (
    application_id in (select id from public.applications where student_id = auth.uid())
  );

drop policy if exists "sections: advisor inserts for their students'" on public.application_sections;
create policy "sections: advisor inserts for their students'" on public.application_sections
  for insert with check (
    application_id in (
      select id from public.applications
      where student_id in (select id from public.profiles where primary_advisor_id = auth.uid())
    )
  );

drop policy if exists "sections: agency admin inserts agency-wide" on public.application_sections;
create policy "sections: agency admin inserts agency-wide" on public.application_sections
  for insert with check (
    application_id in (
      select a.id from public.applications a
      join public.profiles p on p.id = a.student_id
      where p.agency_id = public.current_user_agency_id()
        and public.current_user_role() = 'agency_admin'
    )
  );
