"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropic, AI_FEEDBACK_MODEL } from "@/lib/anthropic";
import { getLiveblocksServerClient, AI_FEEDBACK_USER_ID } from "@/lib/liveblocks-server";

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
    .select("id")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) return { success: false, error: "not_authorized" };

  let feedbackText: string;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  try {
    const message = await getAnthropic().messages.create({
      model: AI_FEEDBACK_MODEL,
      max_tokens: 900,
      system:
        "You are an experienced, encouraging US college application essay advisor. Give " +
        "specific, actionable feedback on structure, voice, specificity, clichés, and grammar. " +
        "Keep it concise (under 300 words), organized as a few short paragraphs, and always " +
        "note at least one genuine strength before suggestions. Do not rewrite the essay for " +
        "the student — describe what to change, not the replacement text.",
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
          body: toCommentBody(`🤖 AI 回饋\n\n${feedbackText}`),
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
      requested_by: user.id,
      model: AI_FEEDBACK_MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    });
  } catch (err) {
    console.error("generateEssayFeedback: failed to log usage", err);
  }

  return { success: true };
}
