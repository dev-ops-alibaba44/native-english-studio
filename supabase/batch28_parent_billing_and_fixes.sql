-- =====================================================================
-- Batch 28 — parent invoice history table.
-- (Items 2–6 from Dan's feedback are application-code fixes only, no
-- schema changes needed — see README for details. This migration only
-- covers item 1: a real billing_events-style table for parent accounts,
-- replacing the "view your invoices via Stripe's portal only" stopgap
-- from Batch 27.)
--
-- Run in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run on an existing database — only adds a new table + policies.
-- =====================================================================

create table if not exists public.parent_billing_events (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parent_accounts(id) on delete cascade,
  stripe_event_id text not null unique, -- dedupes retried webhook deliveries, same pattern as billing_events
  type text not null,                   -- e.g. 'invoice.paid'
  amount_total integer,                 -- in cents
  currency text,
  status text,                          -- 'paid' | 'open' | 'void' | etc
  hosted_invoice_url text,
  created_at timestamptz not null default now()
);

create index if not exists parent_billing_events_parent_id_idx
  on public.parent_billing_events (parent_id);

alter table public.parent_billing_events enable row level security;

drop policy if exists "parent_billing_events: parent reads own" on public.parent_billing_events;
create policy "parent_billing_events: parent reads own" on public.parent_billing_events
  for select using (
    parent_id = auth.uid()
    and public.current_user_role() = 'parent'
  );

drop policy if exists "parent_billing_events: super_admin reads all" on public.parent_billing_events;
create policy "parent_billing_events: super_admin reads all" on public.parent_billing_events
  for select using (public.current_user_role() = 'super_admin');

-- No insert/update/delete policy for regular users — only the webhook route
-- (using the Supabase service-role key, which bypasses RLS) writes here,
-- same as the agency-side billing_events table.
