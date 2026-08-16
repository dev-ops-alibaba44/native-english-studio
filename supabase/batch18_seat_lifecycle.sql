-- Batch 18: seat lifecycle.
-- Run in Supabase SQL editor. Safe to run once against the existing
-- production schema (uses IF NOT EXISTS / do-block guards throughout,
-- like batch6/batch13 before it).
--
-- Root problem this solves: agencies.standard_seats / premium_seats were
-- just two integers with no record of WHEN a seat was bought or WHETHER
-- it's been used — so none of the rules Dan asked for (7-day cancel window,
-- no downgrade, 365-day expiry, "unused seat rolls to next year, otherwise
-- no refunds ever, no reuse ever") could actually be checked. This table
-- makes each seat a real row that can be checked.

-- ---------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type public.seat_type as enum ('standard', 'premium');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  -- unused    -> bought, never assigned to a student OR assigned but the
  --              student has never had any content-creating action happen
  --              (the ONE case, per Dan, that can roll into the following
  --              year instead of just expiring — see lib/seats.ts)
  -- active    -> assigned to a student who has real data
  -- archived  -> agency archived the student who held this seat. The seat
  --              does NOT free up — per Dan's explicit call, an archived
  --              seat is simply gone; a new student needs a newly bought
  --              seat, no exceptions.
  -- expired   -> 365 days passed since purchased_at
  -- canceled  -> canceled within the 7-day unused window; kept as a row
  --              (not deleted) so the Stripe proration/credit has an
  --              audit trail
  create type public.seat_status as enum ('unused', 'active', 'archived', 'expired', 'canceled');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------
-- 2. Seats
-- ---------------------------------------------------------------------
create table if not exists public.seats (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  seat_type public.seat_type not null,
  status public.seat_status not null default 'unused',
  assigned_student_id uuid references public.profiles(id) on delete set null,
  purchased_at timestamptz not null default now(),
  -- fixed 365 days from purchase, per Dan: "no arguments." Never extended,
  -- never reset by archiving (confirmed explicitly).
  expires_at timestamptz not null default (now() + interval '365 days'),
  stripe_subscription_item_id text,
  created_at timestamptz not null default now()
);

-- A seat can only ever be assigned to one student, and — since seats are
-- never reused once assigned — a student can only ever hold one seat.
create unique index if not exists seats_assigned_student_id_idx
  on public.seats (assigned_student_id)
  where assigned_student_id is not null;

create index if not exists seats_agency_id_idx on public.seats (agency_id);

alter table public.seats enable row level security;

drop policy if exists "seats: agency admin reads own agency's seats" on public.seats;
create policy "seats: agency admin reads own agency's seats" on public.seats
  for select using (
    agency_id = public.current_user_agency_id()
    and public.current_user_role() = 'agency_admin'
  );

-- No insert/update/delete policy for any authenticated role — seats are
-- only ever written by server actions using the admin (service-role)
-- client, so every write goes through the app's enforcement logic
-- (app/actions/seats.ts), never a direct client write.

-- ---------------------------------------------------------------------
-- 3. Archiving on profiles (agency archives a student — never deletes)
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz;
