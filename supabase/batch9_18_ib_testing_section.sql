-- =====================================================================
-- Batch 9.18 — add IB as a fifth 測驗成績 (Testing) subsection, between
-- AP and language testing. Same table as the other four categories
-- (student_test_scores), just widening the `category` check constraint
-- to allow 'ib' — no new table needed.
--
-- Postgres doesn't support "alter constraint", so this drops the old
-- check and re-adds it with 'ib' included. Existing rows are untouched
-- (none of them can violate the new, wider constraint).
-- =====================================================================

alter table public.student_test_scores
  drop constraint if exists student_test_scores_category_check;

alter table public.student_test_scores
  add constraint student_test_scores_category_check
  check (category in ('ap', 'ib', 'language', 'admissions', 'other'));
