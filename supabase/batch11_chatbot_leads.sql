-- =====================================================================
-- Batch 11 — homepage chatbot lead capture.
--
-- One row per chat turn (both the visitor's message and the assistant's
-- reply), plus an optional "lead" row when a visitor submits their email
-- through the widget's own email field (never parsed out of free chat
-- text — see components/marketing/ChatWidget.tsx for why). Grouped by
-- session_id (a random id generated client-side, held in memory for the
-- browser tab) so a human reviewer can reconstruct a full conversation.
--
-- Deliberately append-only, same reasoning as agency_inquiries /
-- waitlist_signups in batch10_public_inquiries.sql: RLS grants INSERT
-- only, never UPDATE or SELECT, to anon/authenticated. An anonymous
-- visitor has no way to prove which session_id is "theirs" at the RLS
-- layer, so an UPDATE policy scoped by session_id would actually be
-- wide open to anyone — append-only sidesteps that gap entirely rather
-- than trying to patch around it.
-- =====================================================================

create table if not exists public.chatbot_messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  role text not null check (role in ('user', 'assistant', 'lead')),
  content text not null default '',
  email text,
  created_at timestamptz not null default now()
);

alter table public.chatbot_messages enable row level security;

drop policy if exists "public can insert chatbot messages" on public.chatbot_messages;
create policy "public can insert chatbot messages"
  on public.chatbot_messages for insert
  to anon, authenticated
  with check (true);

create index if not exists chatbot_messages_session_idx
  on public.chatbot_messages (session_id, created_at);
create index if not exists chatbot_messages_created_at_idx
  on public.chatbot_messages (created_at desc);

-- To review conversations/leads for now: Supabase Dashboard → Table Editor
-- → chatbot_messages, sorted/grouped by session_id. Rows with role='lead'
-- are the ones with an email attached — filter on `email is not null`
-- to see who to follow up with.
