-- =====================================================================
-- Native English Studio — Batch 5 patch: advisor capacity
-- Safe to run on your existing database — only adds one new column.
-- =====================================================================

-- How many students an advisor can reasonably handle at once. Nullable —
-- if not set, the app falls back to a default of 25 (see the capacity
-- page). An agency admin can raise or lower this per advisor later once
-- there's a settings UI for it; for now it can be set directly in SQL:
--
--   update public.profiles set capacity = 30 where display_name = '測試顧問';
--
alter table public.profiles add column if not exists capacity int;
