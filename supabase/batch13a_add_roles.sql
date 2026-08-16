-- =====================================================================
-- Batch 13, step 1 of 2 — add the two new roles to the user_role enum.
--
-- RUN THIS FILE FIRST, BY ITSELF (paste into the SQL editor and Run),
-- THEN run batch13b_super_admin_rls.sql as a SEPARATE "Run" afterwards.
--
-- Why two files instead of one: Postgres doesn't allow a brand-new enum
-- value to be USED in the same transaction that ADDs it, and Supabase's
-- SQL editor executes a whole pasted script as one implicit transaction.
-- Pasting the ALTER TYPE lines and the policies that reference
-- 'super_admin'/'marketing' in the same "Run" would fail partway through.
-- Running them as two separate Run clicks avoids that entirely.
-- =====================================================================

alter type public.user_role add value if not exists 'super_admin';
alter type public.user_role add value if not exists 'marketing';
