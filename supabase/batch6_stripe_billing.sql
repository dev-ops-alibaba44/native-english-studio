-- Batch 6: Stripe billing schema patch.
-- Run this in the Supabase SQL editor against your existing project.
-- Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE throughout).

-- ---------------------------------------------------------------------
-- 1. Add Stripe fields to agencies.
-- ---------------------------------------------------------------------
alter table public.agencies
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan_status text not null default 'inactive',
  add column if not exists standard_seats integer not null default 0,
  add column if not exists premium_seats integer not null default 0,
  add column if not exists current_period_end timestamptz;

-- plan_status values used by the app: 'inactive' | 'active' | 'past_due' | 'canceled'

create unique index if not exists agencies_stripe_customer_id_idx
  on public.agencies (stripe_customer_id)
  where stripe_customer_id is not null;

-- ---------------------------------------------------------------------
-- 2. Billing events / invoice history — populated by the Stripe webhook,
--    read by the agency billing page ("帳單紀錄").
-- ---------------------------------------------------------------------
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  stripe_event_id text not null unique, -- dedupes retried webhook deliveries
  type text not null,                   -- e.g. 'invoice.paid'
  amount_total integer,                 -- in cents
  currency text,
  status text,                          -- 'paid' | 'open' | 'void' | etc
  hosted_invoice_url text,
  created_at timestamptz not null default now()
);

alter table public.billing_events enable row level security;

drop policy if exists "billing_events: agency admin reads own agency" on public.billing_events;
create policy "billing_events: agency admin reads own agency" on public.billing_events
  for select using (
    agency_id = public.current_user_agency_id()
    and public.current_user_role() = 'agency_admin'
  );

-- No insert/update/delete policy for regular users — only the webhook route
-- (using the Supabase service-role key, which bypasses RLS) writes here.
