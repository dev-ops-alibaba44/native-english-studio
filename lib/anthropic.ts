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

// Batch 9.20.1 fix — Vercel deploy failure.
//
// The Messages API genuinely accepts a `cache_control` field on individual
// `system` content blocks (this is documented, GA behavior, not a beta
// feature) — that part of the Batch 9.4 implementation was correct. The
// problem is narrower: the exact SDK version this project pins in
// package.json ("@anthropic-ai/sdk": "^0.32.1") ships TypeScript types
// where `TextBlockParam` doesn't yet declare that field, even though the
// live API accepts it. `next dev` never runs a full type-check, so this
// never surfaced locally — Vercel's `next build` does, and fails on it.
//
// Centralizing the (safe, narrow) type cast here — instead of repeating an
// `as` cast at each of the three call sites (ai-feedback.ts, brainstorm.ts,
// profile-assessment.ts) — means there's exactly one place to revisit if
// the SDK version is ever bumped to one whose types include this field
// natively, at which point this cast becomes a no-op and can be removed.
export function cachedSystemBlock(text: string): Anthropic.Messages.TextBlockParam {
  return {
    type: "text",
    text,
    cache_control: { type: "ephemeral" },
  } as Anthropic.Messages.TextBlockParam;
}
