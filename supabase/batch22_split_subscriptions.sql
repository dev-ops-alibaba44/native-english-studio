-- Batch 22: split the license and seats into two separate Stripe
-- subscriptions per agency, instead of one combined subscription with
-- everything as line items.
--
-- Why: with everything on one subscription, Stripe bills and renews it
-- as a single total — an agency with a $2,000/yr license and $1,825/yr
-- of seats saw ONE renewal figure of $3,825/yr, and canceling showed
-- that combined number, which was genuinely confusing and didn't match
-- how Dan thinks about the two as separate commitments. Splitting them
-- into two Stripe Subscription objects means each renews, bills, and
-- cancels independently — the Stripe customer portal (and any
-- cancellation preview) shows the license's $2,000/yr on its own, and
-- the seats subscription's total on its own.
--
-- Access control (who can actually use the product) was ALREADY handled
-- entirely by our own app-level checks — admission-cycle-derived seat
-- expiry (Batch 20) and the agencies.plan_status gate in
-- assertSeatActive() — not by Stripe's renewal mechanics. This migration
-- adds the same kind of independent gate for the seats subscription
-- specifically, so canceling JUST the seats subscription (leaving the
-- license active) also correctly locks out every seat, symmetric to the
-- existing license-lapse gate.

alter table public.agencies
  add column if not exists stripe_seats_subscription_id text,
  add column if not exists seats_plan_status text not null default 'inactive',
  add column if not exists seats_current_period_end timestamptz;

comment on column public.agencies.stripe_subscription_id is
  'The LICENSE subscription only, as of Batch 22 — seats are billed on a separate subscription (stripe_seats_subscription_id).';
comment on column public.agencies.stripe_seats_subscription_id is
  'The SEATS subscription — separate from the license subscription (stripe_subscription_id) as of Batch 22, so each renews and cancels independently.';
comment on column public.agencies.seats_plan_status is
  'Mirrors plan_status but for the seats subscription specifically. assertSeatActive() in lib/seats.ts requires BOTH plan_status and seats_plan_status to be ''active''.';

-- ---------------------------------------------------------------------
-- IMPORTANT — read before running against any agency created before
-- this batch:
--
-- Any agency that already subscribed (Batches 17–21) has its license
-- AND seats bundled on ONE existing combined Stripe subscription, still
-- referenced by stripe_subscription_id. This migration does NOT split
-- that existing Stripe subscription automatically — Stripe has no API
-- to split a subscription's line items into two separate subscriptions,
-- so a real split requires actually canceling the old combined
-- subscription and re-subscribing through the new two-subscription flow.
--
-- Without the backfill below, every pre-existing agency's
-- seats_plan_status would default to 'inactive', and Batch 22's stricter
-- assertSeatActive() check would immediately lock out every one of
-- their students, even though their old subscription is still actually
-- paying and active in Stripe.
--
-- Since this is pre-launch test data (no real paying customers yet per
-- Dan), the safe move is this one-time backfill: treat any agency
-- that's currently marked active and already has seats as if its seats
-- subscription is active too, so nothing breaks immediately. Then, to
-- get a REAL split for these test agencies, cancel their existing test
-- subscription in the Stripe dashboard and run through "開始訂閱" again
-- — Batch 22's checkout only ever creates the license subscription, and
-- the webhook creates a genuinely separate seats subscription right
-- after, giving you real two-subscription behavior to test against.
update public.agencies
set seats_plan_status = 'active'
where plan_status = 'active'
  and (standard_seats > 0 or premium_seats > 0)
  and stripe_seats_subscription_id is null;
