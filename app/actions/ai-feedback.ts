"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropic, AI_FEEDBACK_MODEL, cachedSystemBlock } from "@/lib/anthropic";
import { getLiveblocksServerClient, AI_FEEDBACK_USER_ID } from "@/lib/liveblocks-server";
import { MONTHLY_ESSAY_FEEDBACK_LIMIT } from "@/lib/ai-limits";
import { assertSeatActive, SeatInactiveError } from "@/lib/seats";

function periodStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

// Shared by the AI-feedback button (to enforce the cap) and the student
// account-settings gauge (to display it) — one source of truth for both.
export async function getEssayFeedbackUsage(
  studentId: string
): Promise<{ used: number; limit: number }> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("ai_feedback_log")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .gte("created_at", periodStart().toISOString());
  return { used: count ?? 0, limit: MONTHLY_ESSAY_FEEDBACK_LIMIT };
}

function toCommentBody(text: string) {
  // Liveblocks comment bodies use their own simple rich-text schema, not
  // Tiptap/ProseMirror JSON — one paragraph node per blank-line-separated
  // paragraph is enough for readable AI feedback.
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  return {
    version: 1 as const,
    content: paragraphs.map((p) => ({
      type: "paragraph" as const,
      children: [{ text: p }],
    })),
  };
}

export async function generateEssayFeedback(
  applicationId: string,
  roomId: string,
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const essayText = ((formData.get("essay_text") as string) || "").trim();

  if (!essayText) {
    return { success: false, error: "essay_empty" };
  }
  if (essayText.split(/\s+/).length < 30) {
    return { success: false, error: "essay_too_short" };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: "ai_not_configured" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_signed_in" };

  // Confirms the caller actually has access to this application, the same
  // way app/api/liveblocks-auth/route.ts does — reuses RLS rather than
  // re-implementing the role logic here.
  const { data: application } = await supabase
    .from("applications")
    .select("id, student_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) return { success: false, error: "not_authorized" };

  try {
    await assertSeatActive(application.student_id);
  } catch (err) {
    if (err instanceof SeatInactiveError) return { success: false, error: err.code };
    throw err;
  }

  const { used, limit } = await getEssayFeedbackUsage(application.student_id);
  if (used >= limit) return { success: false, error: "monthly_limit_reached" };

  let feedbackText: string;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let cacheCreationTokens: number | null = null;
  let cacheReadTokens: number | null = null;

  try {
    const message = await getAnthropic().messages.create({
      model: AI_FEEDBACK_MODEL,
      max_tokens: 900,
      // Prompt caching: the system prompt below is identical on every
      // request (only the essay text in the user message changes), so
      // marking it cacheable means repeat calls are charged a much
      // cheaper "cache read" rate for these tokens instead of full price
      // every time. Note: this only meaningfully pays off once the cached
      // block is reasonably long (roughly 1,000+ tokens for Haiku-class
      // models) — that's part of why the rubric below is fuller than the
      // bare minimum; a one-sentence system prompt wouldn't hit that
      // threshold and caching it would save close to nothing.
      //
      // (The reference snippet used a top-level `cache_control` param on
      // messages.create() — that's not the current API shape. The real
      // mechanism is a `cache_control` field on the specific content
      // block you want cached, as used below.)
      system: [
        cachedSystemBlock(
          "You are an experienced, encouraging US college application essay advisor working " +
            "for a Taiwan-based consultancy. Students you're reviewing are applying to English-" +
            "medium universities and are not native English speakers, so be attentive to both " +
            "substance and language issues without being discouraging about the latter.\n\n" +
            "IMPORTANT: Write your entire response in Traditional Chinese (繁體中文), not English. " +
            "The student reads Traditional Chinese; the essay itself stays in English (do not " +
            "translate the essay or quote long passages of it back), but your feedback ABOUT the " +
            "essay must be in Traditional Chinese throughout, including when naming strengths, " +
            "issues, or examples. It is fine to quote a short English phrase from the essay (a few " +
            "words) inline when pointing to a specific spot, but the surrounding commentary is " +
            "always Traditional Chinese.\n\n" +
            "Evaluate the essay across these dimensions:\n" +
            "1. Structure — does it have a clear arc (hook, development, reflection/growth, " +
            "closing), or does it wander?\n" +
            "2. Voice and specificity — is it full of generic statements ('I learned the value " +
            "of hard work') or grounded in concrete, personal, sensory detail only this student " +
            "could have written?\n" +
            "3. Clichés — flag overused college-essay tropes (the big game, the mission trip " +
            "epiphany, generic 'diversity' statements) if present, gently.\n" +
            "4. Grammar and clarity — note recurring patterns of error (not just one-off typos), " +
            "especially ones common for the student's likely first-language background, without " +
            "turning this into a line-by-line copyedit.\n" +
            "5. What the essay reveals about the applicant as a person, and whether that comes " +
            "through clearly to an admissions reader who has never met them.\n\n" +
            "Output format: a few short paragraphs, under 300 words total. Always open by naming " +
            "at least one genuine, specific strength before any suggestions. Do not rewrite the " +
            "essay for the student — describe what to change, not the replacement text. Do not " +
            "use a numbered or bulleted list in your output; write in prose."
        ),
      ],
      messages: [
        {
          role: "user",
          content: `Please give feedback on this college application essay:\n\n${essayText}`,
        },
      ],
    });

    feedbackText = message.content
      .map((block: any) => (block.type === "text" ? block.text : ""))
      .filter(Boolean)
      .join("\n\n");
    inputTokens = message.usage?.input_tokens ?? null;
    outputTokens = message.usage?.output_tokens ?? null;
    cacheCreationTokens = (message.usage as any)?.cache_creation_input_tokens ?? null;
    cacheReadTokens = (message.usage as any)?.cache_read_input_tokens ?? null;

    if (!feedbackText.trim()) {
      return { success: false, error: "ai_empty_response" };
    }
  } catch (err) {
    console.error("generateEssayFeedback: Anthropic API call failed", err);
    return { success: false, error: "ai_request_failed" };
  }

  try {
    await getLiveblocksServerClient().createThread({
      roomId,
      data: {
        comment: {
          userId: AI_FEEDBACK_USER_ID,
          body: toCommentBody(feedbackText),
        },
      },
    });
  } catch (err) {
    console.error("generateEssayFeedback: failed to post Liveblocks comment", err);
    return { success: false, error: "comment_post_failed" };
  }

  // Best-effort usage logging — never fail the whole request over this,
  // since the feedback itself already posted successfully.
  try {
    const admin = createAdminClient();
    await admin.from("ai_feedback_log").insert({
      application_id: applicationId,
      student_id: application.student_id,
      requested_by: user.id,
      model: AI_FEEDBACK_MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_creation_tokens: cacheCreationTokens,
      cache_read_tokens: cacheReadTokens,
    });
  } catch (err) {
    console.error("generateEssayFeedback: failed to log usage", err);
  }

  return { success: true };
}
