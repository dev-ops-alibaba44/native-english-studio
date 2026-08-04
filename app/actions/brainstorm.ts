"use server";

import { createClient } from "@/lib/supabase/server";
import { getAnthropic, AI_FEEDBACK_MODEL } from "@/lib/anthropic";

export interface BrainstormMessage {
  role: "user" | "assistant";
  content: string;
}

// Not tied to any specific application/draft — this is a lightweight,
// standalone ideation tool (paste an essay prompt, think out loud with the
// AI, no saving). Any signed-in student/advisor/agency_admin can use it;
// there's no per-record RLS check needed the way essay feedback needs one,
// since nothing here reads or writes another user's data.
export async function brainstormReply(
  history: BrainstormMessage[],
  newMessage: string
): Promise<{ success: true; reply: string } | { success: false; error: string }> {
  const trimmed = newMessage.trim();
  if (!trimmed) return { success: false, error: "empty_message" };
  if (!process.env.ANTHROPIC_API_KEY) return { success: false, error: "ai_not_configured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_signed_in" };

  // Cap history sent to the model — this is a brainstorming aid, not a
  // long-running document, so a rolling window keeps token cost bounded
  // even if someone leaves a tab chatting for a while.
  const recentHistory = history.slice(-12);

  try {
    const message = await getAnthropic().messages.create({
      model: AI_FEEDBACK_MODEL,
      max_tokens: 500,
      system: [
        {
          type: "text",
          text:
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
            "directly.\n\n" +
            "IMPORTANT: Write your responses in Traditional Chinese (繁體中文), even though the essay " +
            "prompt and the student's own notes may be in English. It's fine to quote a short English " +
            "phrase from what they wrote, but your questions and comments are always in Chinese.",
          cache_control: { type: "ephemeral" },
        },
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
