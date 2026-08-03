-- Batch 8: schema support for the rich-text annotation system.
--
-- Run this in the Supabase SQL editor against your existing project.
-- Safe to run multiple times.

-- ---------------------------------------------------------------------
-- 1. drafts.content_json — the formatted document (Tiptap/ProseMirror JSON).
--    `content` (plain text) is kept as-is and still updated on every save,
--    so word counts, the draft-history list, and anything else reading
--    plain text keep working unchanged. content_json is additive.
-- ---------------------------------------------------------------------
alter table public.drafts
  add column if not exists content_json jsonb;

-- ---------------------------------------------------------------------
-- 2. comments.range_from / range_to — the exact text range a comment
--    anchors to, as ProseMirror document positions within that specific
--    draft's content_json. Since a draft version's content_json never
--    changes after it's created (drafts are immutable snapshots — new
--    edits create a new version, per the existing versioning model),
--    these positions stay valid forever for that draft. This is what
--    lets the app draw a highlight under the exact commented phrase,
--    without ever needing to write back into a past (or even the
--    current) draft's content. anchor_text remains as a plain-text
--    preview snippet (used already; kept for backward compatibility
--    and anywhere we don't want to load the full editor).
-- ---------------------------------------------------------------------
alter table public.comments
  add column if not exists range_from integer,
  add column if not exists range_to integer;
