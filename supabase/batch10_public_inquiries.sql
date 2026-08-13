-- =====================================================================
-- Batch 10 — public marketing site: two lead-capture tables.
--
-- The new homepage has two sign-up paths (B2B2C: agencies vs individual
-- students/parents), and neither one creates a live account yet:
--   - agency_inquiries  — B2B licensing inquiries. Followed up on
--     manually by Dan, same as every existing account today (all
--     hand-created in Supabase — see HANDOFF_4.md).
--   - waitlist_signups  — individual student/parent interest. Held
--     until the direct-to-parent tier + parent auth + a real tier
--     field exist (see HANDOFF_4.md "Known gaps" — this is explicitly
--     deferred, not silently faked as a working signup).
--
-- No account creation, no auth changes, no billing touched. Purely two
-- new public tables that only ever get written to from the outside,
-- never read from the outside.
-- =====================================================================

create table if not exists public.agency_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  city text,
  estimated_students text,
  message text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'converted', 'declined'))
);

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  role text not null check (role in ('student', 'parent')),
  name text,
  email text not null,
  city text,
  notes text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'converted', 'declined'))
);

alter table public.agency_inquiries enable row level security;
alter table public.waitlist_signups enable row level security;

-- Public, unauthenticated visitors may INSERT only — never SELECT, UPDATE,
-- or DELETE. There is deliberately no SELECT policy at all here, so the
-- anon/authenticated roles fall through to the default deny; only the
-- service role (Supabase dashboard SQL editor for now, or a future
-- internal review page built with the admin client) can ever read these
-- rows back out. This is the same "RLS silently returns nothing unless
-- explicitly granted" behavior the rest of the app already relies on.
drop policy if exists "public can submit agency inquiries" on public.agency_inquiries;
create policy "public can submit agency inquiries"
  on public.agency_inquiries for insert
  to anon, authenticated
  with check (true);

drop policy if exists "public can submit waitlist signups" on public.waitlist_signups;
create policy "public can submit waitlist signups"
  on public.waitlist_signups for insert
  to anon, authenticated
  with check (true);

create index if not exists agency_inquiries_created_at_idx
  on public.agency_inquiries (created_at desc);
create index if not exists waitlist_signups_created_at_idx
  on public.waitlist_signups (created_at desc);

-- To review submissions for now: Supabase Dashboard → Table Editor →
-- agency_inquiries / waitlist_signups (dashboard access uses the service
-- role internally, so RLS doesn't block Dan from seeing them there).
