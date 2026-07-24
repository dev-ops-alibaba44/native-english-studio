// Shared across the whole app — student portal, and later the advisor
// and agency-admin portals — so every page uses the exact same stage
// order and Chinese labels as the approved prototype.

export const STAGE_ORDER = [
  "brainstorm",
  "outline",
  "draft",
  "advisor_feedback",
  "revision",
  "final",
] as const;

export type Stage = (typeof STAGE_ORDER)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  brainstorm: "發想",
  outline: "大綱",
  draft: "初稿",
  advisor_feedback: "顧問回饋",
  revision: "修訂",
  final: "定稿",
};

export function stageIndex(stage: Stage): number {
  return STAGE_ORDER.indexOf(stage);
}
