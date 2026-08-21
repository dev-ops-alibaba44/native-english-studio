-- Batch 27: (a) nothing new needed for agency self-signup (item 5) — it
-- reuses the existing agencies/profiles tables and Stripe webhook as-is.
-- (b) the parent/individual account model (item 6): a new role, a new
-- parent_accounts table mirroring how `agencies` holds B2B billing state
-- (kept separate rather than bolted onto `profiles` for the same reason
-- `agencies` is separate — most profiles are never a parent, and most
-- parent-billing fields would just be null noise on every other row).
-- Run in Supabase SQL editor. Safe to run once (uses if not exists).

-- ---------------------------------------------------------------------
-- 1. New role.
-- ---------------------------------------------------------------------
alter type public.user_role add value if not exists 'parent';

-- ---------------------------------------------------------------------
-- 2. Parent -> child linkage. One parent per student (not a join table
--    like student_advisors — a student here has exactly one payer),
--    capped at 3 children per parent per Dan's explicit instruction,
--    enforced both here (defense in depth) and in the app.
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists parent_id uuid references public.profiles(id) on delete cascade,
  -- Which direct-to-consumer tier this child's seat is: 'basic' | 'advanced'.
  -- Only meaningful when parent_id is set — an agency-linked student uses
  -- the existing seats table instead, not this column.
  add column if not exists seat_tier text check (seat_tier in ('basic', 'advanced'));

create index if not exists profiles_parent_id_idx on public.profiles(parent_id);

create or replace function public.check_max_three_children()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is not null then
    if (select count(*) from public.profiles where parent_id = new.parent_id and id <> new.id) >= 3 then
      raise exception 'A parent account cannot have more than 3 children.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_max_three_children on public.profiles;
create trigger profiles_max_three_children
  before insert or update of parent_id on public.profiles
  for each row execute function public.check_max_three_children();

-- ---------------------------------------------------------------------
-- 3. Parent billing/account state — one row per parent profile.
-- ---------------------------------------------------------------------
create table if not exists public.parent_accounts (
  id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  -- 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled'
  plan_status text not null default 'inactive',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  -- Batch 27: simple abuse guard for the 7-day trial per Dan's
  -- instruction ("limited cap on AI usage during the trial"). Checked
  -- and incremented by lib/parent-trial.ts before any AI call on behalf
  -- of one of this parent's children while plan_status = 'trialing'.
  -- Resets have no meaning here (it's a per-trial total, not per-day) —
  -- once the trial ends (converts to paid or gets wiped on cancel) this
  -- number stops being consulted.
  trial_ai_calls_used int not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists parent_accounts_stripe_customer_id_idx
  on public.parent_accounts (stripe_customer_id)
  where stripe_customer_id is not null;

alter table public.parent_accounts enable row level security;

create policy "parent_accounts: parent reads own row" on public.parent_accounts
  for select using (id = auth.uid());

-- No insert/update/delete policy for regular users — only the signup
-- server action and the Stripe webhook (both using the service-role
-- key, which bypasses RLS) write here.

-- ---------------------------------------------------------------------
-- 4. RLS so a parent can see/manage their own children's profiles, the
--    same shape as the existing "profiles: agency admin reads their
--    agency" policy.
-- ---------------------------------------------------------------------
create policy "profiles: parent reads their children" on public.profiles
  for select using (parent_id = auth.uid());

create policy "profiles: parent updates their children" on public.profiles
  for update using (parent_id = auth.uid());
