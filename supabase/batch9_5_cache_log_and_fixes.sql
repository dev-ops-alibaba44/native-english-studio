-- Batch 9.5: track prompt-cache effectiveness in the AI feedback log.
-- Run this in the Supabase SQL editor.

alter table public.ai_feedback_log
  add column if not exists cache_creation_tokens integer,
  add column if not exists cache_read_tokens integer;

-- Reminder, not a code fix: if generateEssayFeedback's usage-logging step
-- has been silently failing with "SUPABASE_SERVICE_ROLE_KEY is not set",
-- that env var needs an actual value in .env.local — Supabase Dashboard ->
-- Settings -> API -> service_role secret key. This was already documented
-- as a placeholder in .env.local.example since Batch 6 (for the Stripe
-- webhook), but it looks like it was never filled in with a real value.
-- This only affects the usage log, not whether feedback itself works.
