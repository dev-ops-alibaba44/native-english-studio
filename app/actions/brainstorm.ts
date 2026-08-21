"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropic, AI_FEEDBACK_MODEL, cachedSystemBlock } from "@/lib/anthropic";
import { assertSeatActive, SeatInactiveError } from "@/lib/seats";
import { checkAndConsumeParentTrialAiQuota } from "@/lib/parent-trial";

export interface BrainstormMessage {
  role: "user" | "assistant";
  content: string;
}

// Resource cap (Dan's request 3): a generous but real daily ceiling on AI
// brainstorming calls per STUDENT (not per caller — an advisor helping
// three different students in one day uses each student's own 30/day
// allowance, not a shared one), so a runaway/looping session (or several
// long ones in a day) can't quietly rack up cost. 30 calls/day is roughly
// 5-6 genuine back-and-forth conversations — plenty for real use, but not
// unbounded. Counted via brainstorm_usage_log, one row per successful call.
const DAILY_BRAINSTORM_LIMIT = 30;
// Rolling context window (in messages, so 4 user+AI turns) sent to the
// model each call — brainstorming doesn't need unlimited history, and
// this keeps each individual call's input tokens bounded regardless of
// how long a single conversation runs.
const HISTORY_WINDOW = 8;

async function checkAndLogQuota(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("brainstorm_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());
  if ((count ?? 0) >= DAILY_BRAINSTORM_LIMIT) return false;
  await supabase.from("brainstorm_usage_log").insert({ user_id: userId });
  return true;
}

// Read-only variant of the same count, for the account-settings usage
// gauge (Batch 9.10), and now also for advisor/agency AI-usage
// monitoring (Batch 9.20) — doesn't insert a row, just reports where a
// given student stands against today's limit. Uses the admin client
// (not the RLS-scoped one, unlike checkAndLogQuota above) because this
// now needs to report on OTHER people's usage, not just the caller's
// own — brainstorm_usage_log's RLS is intentionally scoped to
// "user_id = auth.uid()" only, so an advisor calling this with a
// student's id through the regular client would silently get back 0
// (RLS quietly filtering out rows, not an error) rather than the real
// count. Authorization is the calling page's job, same as the other two
// usage getters in ai-feedback.ts and profile-assessment.ts.
export async function getBrainstormUsageToday(
  userId: string
): Promise<{ used: number; limit: number }> {
  const admin = createAdminClient();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count } = await admin
    .from("brainstorm_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());
  return { used: count ?? 0, limit: DAILY_BRAINSTORM_LIMIT };
}

export async function brainstormReply(
  history: BrainstormMessage[],
  newMessage: string,
  studentId: string
): Promise<{ success: true; reply: string } | { success: false; error: string }> {
  const trimmed = newMessage.trim();
  if (!trimmed) return { success: false, error: "empty_message" };
  if (!process.env.ANTHROPIC_API_KEY) return { success: false, error: "ai_not_configured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_signed_in" };

  // Batch 28 fix: this used to check/log against `user.id` (the
  // CALLER), which is correct when a student is chatting for
  // themselves but wrong the moment an advisor or agency admin uses
  // this on a student's behalf (see /advisor/prompts,
  // /agency/prompts) — it was checking the advisor's own (nonexistent)
  // seat instead of the student they're actually helping, so every
  // advisor brainstorm call silently failed with "no_seat" even though
  // the terminal showed a clean 200 (the server action itself
  // succeeded; only its returned success:false payload signaled the
  // real failure). Every other AI action (ai-feedback.ts,
  // profile-assessment.ts) already took an explicit studentId for
  // exactly this reason — this brings brainstormReply in line with
  // that same pattern.
  //
  // Access check reuses the existing profiles RLS policies (self, or
  // advisor/agency_admin in the same agency) rather than
  // re-implementing that role logic here — same approach documented in
  // ai-feedback.ts.
  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();
  if (!studentProfile) return { success: false, error: "not_authorized" };

  try {
    await assertSeatActive(studentId);
  } catch (err) {
    if (err instanceof SeatInactiveError) return { success: false, error: err.code };
    throw err;
  }

  const trialQuota = await checkAndConsumeParentTrialAiQuota(studentId);
  if (!trialQuota.allowed) return { success: false, error: "parent_trial_limit_reached" };

  const withinQuota = await checkAndLogQuota(studentId);
  if (!withinQuota) return { success: false, error: "daily_limit_reached" };

  const recentHistory = history.slice(-HISTORY_WINDOW);

  try {
    const message = await getAnthropic().messages.create({
      model: AI_FEEDBACK_MODEL,
      max_tokens: 400,
      system: [
        cachedSystemBlock(
          "You are a warm, curious brainstorming partner helping a Taiwanese high school student " +
            "think through ideas for a US college application essay. The student will paste an essay " +
            "prompt (often in English) and then think out loud, sometimes in English, sometimes in " +
            "Chinese.\n\n" +
            "Your job is NOT to write the essay or suggest polished lines. Instead: ask specific, " +
            "concrete follow-up questions that help the student surface real memories and details " +
            "('What did that actually look like?' 'What were you thinking right before that happened?' " +
            "'Who else was there, and what did they say?'). Point out when an idea sounds generic or " +
            "like a cliché, gently, and ask a question that pushes toward something more specific and " +
            "personal to them. Keep responses short — a few sentences and one or two questions, not an " +
            "essay of your own. Never write example sentences or paragraphs the student could paste in " +
            "directly. Do not use Markdown formatting (no **bold**, no bullet dashes) — the response " +
            "renders as plain text, so write in plain prose and simple line breaks only.\n\n" +
            "IMPORTANT: Write your responses in Traditional Chinese (繁體中文), even though the essay " +
            "prompt and the student's own notes may be in English. It's fine to quote a short English " +
            "phrase from what they wrote, but your questions and comments are always in Chinese."
        ),
      ],
      messages: [
        ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: trimmed },
      ],
    });

    const reply = message.content
      .map((block: any) => (block.type === "text" ? block.text : ""))
      .filter(Boolean)
      .join("\n\n");

    if (!reply.trim()) return { success: false, error: "ai_empty_response" };
    return { success: true, reply };
  } catch (err) {
    console.error("brainstormReply: Anthropic API call failed", err);
    return { success: false, error: "ai_request_failed" };
  }
}

// ---------------------------------------------------------------------
// Starter-question answers (small textarea under each prompt)
// ---------------------------------------------------------------------
export async function saveBrainstormAnswer(
  questionKey: string,
  answerText: string
): Promise<{ success: true; savedAt: string } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_signed_in" };

  const now = new Date().toISOString();
  const { error } = await supabase.from("brainstorm_answers").upsert(
    {
      student_id: user.id,
      question_key: questionKey,
      answer_text: answerText,
      updated_at: now,
    },
    { onConflict: "student_id,question_key" }
  );

  if (error) {
    console.error("saveBrainstormAnswer failed:", error);
    return { success: false, error: "save_failed" };
  }
  return { success: true, savedAt: now };
}

// ---------------------------------------------------------------------
// Archive the current live conversation as a static, read-only record —
// this is the ONLY way a conversation is ever persisted. Viewing it later
// (by anyone) just reads this row; it never re-runs the AI or re-sends
// the transcript anywhere.
// ---------------------------------------------------------------------
export interface ArchivedSessionRecord {
  id: string;
  authorName: string;
  createdAt: string;
  transcript: string;
}

// Returns the newly-created row (id/createdAt/authorName/transcript) so the
// client can prepend it straight into local state instead of waiting on a
// page reload or a Server Component refetch to see it — see BrainstormChat
// + BrainstormSessionArchive, which used to depend on the parent page
// re-rendering with fresh data. That never happened without a manual
// reload, since nothing in this flow ever asked Next.js to refetch the
// page. Returning the row here sidesteps that entirely: no cache/
// revalidation timing to get right, the archived transcript just appears.
export async function archiveBrainstormSession(
  studentId: string,
  messages: BrainstormMessage[]
): Promise<{ success: true; session: ArchivedSessionRecord } | { success: false; error: string }> {
  if (messages.length === 0) return { success: false, error: "empty_session" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_signed_in" };

  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const transcript = messages
    .map((m) => `${m.role === "user" ? "【學生/使用者】" : "【AI】"}\n${m.content}`)
    .join("\n\n---\n\n");

  const { data: inserted, error } = await supabase
    .from("brainstorm_sessions")
    .insert({
      student_id: studentId,
      author_id: user.id,
      transcript,
    })
    .select("id, created_at")
    .single();

  if (error || !inserted) {
    console.error("archiveBrainstormSession failed:", error);
    return { success: false, error: "archive_failed" };
  }

  return {
    success: true,
    session: {
      id: inserted.id,
      authorName: authorProfile?.display_name || "使用者",
      createdAt: inserted.created_at,
      transcript,
    },
  };
}
