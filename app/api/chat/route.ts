import { NextRequest, NextResponse } from "next/server";
import { getAnthropic, AI_FEEDBACK_MODEL, cachedSystemBlock } from "@/lib/anthropic";
import { createAdminClient } from "@/lib/supabase/admin";

// Public, unauthenticated endpoint (the homepage chatbot) — reachable by
// anyone on the internet. Two things protect against abuse/runaway cost:
//   1. A per-session daily message cap (below), checked with the admin
//      client purely to COUNT today's rows for rate-limiting — the same
//      "no user session to attach, just a service-side check" case the
//      admin client's own doc comment describes, not a bypass of anyone's
//      actual data protection (chatbot_messages has no SELECT policy for
//      anon at all, so nothing this route reads was reachable by the
//      client anyway).
//   2. A short, bounded conversation history window sent to the model
//      each call (same pattern as app/actions/brainstorm.ts).
const DAILY_MESSAGE_LIMIT = 60;
const HISTORY_WINDOW = 12;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = cachedSystemBlock(
  "You are the homepage chat assistant for Native English Studio (nativeenglish.ca), a " +
    "Taipei-based platform for college-application essay coaching. Answer visitors' questions " +
    "about the service, warmly and concisely, in Traditional Chinese (繁體中文) — even if the " +
    "visitor writes in English, reply in Traditional Chinese unless they explicitly ask for " +
    "English. Do not use Markdown formatting (no **bold**, no bullet dashes); this renders as " +
    "plain chat text.\n\n" +
    "ABOUT THE SERVICE: Native English Studio was founded by Daniel Andrew Bloom (林安森), a " +
    "Berkeley PhD and licensed K-12 teacher, now based in Taipei. The platform helps students " +
    "through a six-stage essay process — 發想 (brainstorm) → 大綱 (outline) → 初稿 (draft) → " +
    "顧問回饋 (advisor feedback) → 修訂 (revision) → 定稿 (final) — with real-time collaborative " +
    "editing between student and advisor, AI-assisted brainstorming and feedback, and a full " +
    "student profile/portfolio system (grades, test scores, activities).\n\n" +
    "WHO IT'S FOR: two audiences, with separate sign-up paths. (1) Educational consultancies / " +
    "留學顧問機構 (agencies) — B2B, an annual licence plus per-student pricing; direct them to " +
    "/signup/agency. (2) Individual students and parents not going through an agency — direct " +
    "them to /signup/individual.\n\n" +
    "PRICING, IF ASKED: give an approximate range, not a firm quote — agency annual licensing " +
    "is roughly USD $1,500–2,500/year depending on size, and per-student seats are roughly USD " +
    "$150–300/year depending on tier. Always add that the exact price depends on their specific " +
    "situation and gets confirmed when they sign up or reach out. For individual/parent pricing " +
    "outside of an agency, say this is still being finalized and the best next step is joining " +
    "the list at /signup/individual.\n\n" +
    "CONVERSATION STYLE: keep replies short (2–4 sentences), like a real chat, not an essay. " +
    "Ask at most one follow-up question at a time. If the conversation is going well and the " +
    "visitor seems genuinely interested, mention that they're welcome to leave their email in " +
    "the field below the chat so the team can follow up — but don't ask for it in every message, " +
    "and never invent facts about pricing, features, or the company beyond what's given here."
);

function getOrCreateSessionId(req: NextRequest): string {
  const existing = req.cookies.get("nes_chat_sid")?.value;
  if (existing) return existing;
  return crypto.randomUUID();
}

export async function POST(req: NextRequest) {
  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage || !lastUserMessage.content?.trim()) {
    return NextResponse.json({ error: "empty_message" }, { status: 400 });
  }

  const sessionId = getOrCreateSessionId(req);
  const admin = createAdminClient();

  // Rate limit — count today's rows for this session before doing any AI call.
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count } = await admin
    .from("chatbot_messages")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .gte("created_at", since.toISOString());

  if ((count ?? 0) >= DAILY_MESSAGE_LIMIT) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const recentHistory = messages.slice(-HISTORY_WINDOW);

  let replyText: string;
  try {
    const response = await getAnthropic().messages.create({
      model: AI_FEEDBACK_MODEL,
      max_tokens: 300,
      system: [SYSTEM_PROMPT],
      messages: recentHistory.map((m) => ({ role: m.role, content: m.content })),
    });
    const textBlock = response.content.find((b) => b.type === "text");
    replyText =
      textBlock && "text" in textBlock
        ? textBlock.text
        : "不好意思，我暫時無法回應，請稍後再試一次，或直接寄信至 info@nativeenglish.ca。";
  } catch (err) {
    console.error("chat route: Anthropic call failed", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }

  // Log both turns — best-effort, never blocks the reply if it fails.
  const { error: logError } = await admin.from("chatbot_messages").insert([
    { session_id: sessionId, role: "user", content: lastUserMessage.content },
    { session_id: sessionId, role: "assistant", content: replyText },
  ]);
  if (logError) {
    console.error("chat route: failed to log transcript", logError);
  }

  const res = NextResponse.json({ reply: replyText });
  res.cookies.set("nes_chat_sid", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 1 day — matches the daily rate-limit window
    path: "/",
  });
  return res;
}
