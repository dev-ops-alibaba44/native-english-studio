-- =====================================================================
-- Batch 9.17 — stop charging (in AI cost AND in the monthly cap) for
-- re-generating an AI 綜合評估 when nothing in the student's profile has
-- actually changed since the last time.
--
-- Dan's real-world test: generated an assessment (1046 tokens in / 1358
-- out), then immediately re-ran it with no data changes and got charged
-- again for an almost-identical call (1046 in / 1134 out) — same cost,
-- same cap usage, for a result that (correctly) came out basically the
-- same both times.
--
-- Fix: profile_assessment_log now also stores a hash of exactly the text
-- that was sent to Claude (the built profile summary — grades + test
-- scores + activities + in-progress applications) plus the generated
-- result itself. Before making a new API call, the server checks the
-- student's most recent log row: if its input_hash matches what would be
-- sent this time, the previous result is returned directly — no new API
-- call, no new log row, no cap usage. The moment the student (or their
-- advisor) changes ANY of that underlying data, the hash changes
-- automatically and the next click generates a genuinely fresh
-- assessment as normal. This is intentionally not a nag/blocker — the
-- student can click "產生新的評估" as often as they like; it just won't
-- burn a real AI call (or their monthly allowance) when there's nothing
-- new to say.
--
-- Existing rows get null in both new columns, which is fine — they just
-- never match a future hash, so the very next generate for any student
-- runs for real exactly once, then caching kicks in from there.
-- =====================================================================

alter table public.profile_assessment_log
  add column if not exists input_hash text,
  add column if not exists content text;

create index if not exists profile_assessment_log_student_created_idx
  on public.profile_assessment_log (student_id, created_at desc);
