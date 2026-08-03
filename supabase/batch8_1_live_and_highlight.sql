-- Batch 8.1: real-time sync + standalone highlighter.
-- Run this in the Supabase SQL editor.

-- ---------------------------------------------------------------------
-- 1. comments.kind — distinguishes a full comment from a standalone
--    highlight (advisor/admin selects text and marks it, with no
--    comment body required — like using a highlighter pen on a printed
--    page, independent of writing a note in the margin).
-- ---------------------------------------------------------------------
alter table public.comments
  add column if not exists kind text not null default 'comment';

alter table public.comments
  drop constraint if exists comments_kind_check;
alter table public.comments
  add constraint comments_kind_check check (kind in ('comment', 'highlight'));

-- ---------------------------------------------------------------------
-- 2. Enable Realtime on drafts + comments, so an advisor viewing a
--    draft sees new comments/highlights (and a newly-saved student
--    draft) appear live, without refreshing the page.
--
-- If this errors with "already a member", that's fine — it just means
-- it's already enabled; ignore that specific error and move on.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.drafts;
alter publication supabase_realtime add table public.comments;

-- NOTE: if the above two lines error, you likely already have Realtime
-- enabled for these tables (or need to enable it via Database ->
-- Replication in the Supabase dashboard instead — toggle "Realtime" on
-- for both the drafts and comments tables there if the SQL commands
-- don't work in your project).
