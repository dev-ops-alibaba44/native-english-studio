import { Liveblocks } from "@liveblocks/node";

let _liveblocks: Liveblocks | null = null;

export function getLiveblocksServerClient(): Liveblocks {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not set.");
  }
  if (!_liveblocks) {
    _liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });
  }
  return _liveblocks;
}

// Synthetic user id for AI-authored comments — not a real Supabase user,
// never goes through app/api/liveblocks-auth/route.ts. Resolved to a
// display name via resolveUsers in components/editor/LiveDocument.tsx.
export const AI_FEEDBACK_USER_ID = "ai-advisor";
