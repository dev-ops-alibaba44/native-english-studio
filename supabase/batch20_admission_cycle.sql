-- Batch 20: admission-cycle-based seat expiry, and a hard gate on the
-- agency's license status.
--
-- Problem this solves: "365 days from purchase" has a gaming hole — an
-- agency could stop renewing its license but keep using seats bought
-- during the previous cycle for months afterward, since each seat's own
-- expiry clock is independent of the agency's subscription status. Two
-- changes close this:
--   1. A seat's expiry is now tied to a real calendar boundary the agency
--      chooses (which admission cycle the seat is for), not an arbitrary
--      "365 days from whenever it was bought" — e.g. a seat for the
--      2026–2027 cycle (student starting university Sept 2027) expires
--      August 31, 2027, full stop.
--   2. Independently of any single seat's own expiry, if the agency's
--      license itself isn't active (canceled, past due, never
--      subscribed), NOTHING is usable — checked in lib/seats.ts's
--      assertSeatActive() against agencies.plan_status, not just the
--      seat's own status. A canceled license blocks every seat under it
--      immediately, regardless of how much of that seat's own cycle is
--      left.
--
-- Legacy seats (bought before this batch) keep whatever expires_at they
-- already had from the old 365-days-from-purchase rule until an agency
-- admin sets an admission cycle for them (via the "設定入學年度" control
-- on the billing page) — at which point expires_at is recalculated to
-- August 31 of that cycle's end year.

alter table public.seats
  add column if not exists admission_cycle_end_year integer;

comment on column public.seats.admission_cycle_end_year is
  'The year the student starts university for this seat''s admission cycle. Seat expires August 31 of this year. Null = legacy seat, still on the old purchased_at+365-days expires_at until an admin sets a cycle for it.';
