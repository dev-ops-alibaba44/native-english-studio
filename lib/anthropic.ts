import Anthropic from "@anthropic-ai/sdk";

// Server-only. Never import this from a client component.
//
// Model choice: claude-haiku-4-5-20251001 — the cheapest current Claude
// model, per your instruction. Essay feedback doesn't need the most
// powerful model available, and this keeps per-request cost low while we
// still don't have a credit/billing system wrapped around usage.
export const AI_FEEDBACK_MODEL = "claude-haiku-4-5-20251001";

let _anthropic: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set — add it to .env.local before using AI feedback."
    );
  }
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}
