// Shared AI usage-cap constants. Deliberately NOT in app/actions/ai-feedback.ts
// or app/actions/brainstorm.ts — those are "use server" files, and Next.js
// only allows async function exports from a "use server" file (a plain
// `export const X = 20` there is a build error, not just a lint warning).
// This file has no directive, so it's safe to import from both server
// actions and, if ever needed, client components.

// Resource cap (Dan's request, Batch 9.10): pooled across ALL of a
// student's applications, not per-essay — a student revising 5-10 essays
// ahead of deadlines can burn through feedback calls across many of them,
// not just one. Mirrors the brainstorming cap's shape (Batch 9.9) but on a
// 30-day rolling window rather than daily, since essay feedback is a much
// heavier, less-frequent action than a brainstorming chat turn — a daily
// reset would essentially never bind. This number is a starting point, not
// a researched figure; adjust freely once real usage is visible in
// ai_feedback_log.
export const MONTHLY_ESSAY_FEEDBACK_LIMIT = 20;

// AI 綜合評估 (profile assessment, Batch 9.16) is a much heavier call
// than a single essay's feedback — it reads across a student's entire
// grades/tests/activities/essays in one go — so the cap is deliberately
// much lower. Same "starting guess, not researched" caveat as the essay
// cap above.
export const MONTHLY_PROFILE_ASSESSMENT_LIMIT = 5;

// Existing brainstorming cap (Batch 9.9) — was a local const inside
// app/actions/brainstorm.ts, which was fine there since it was never
// exported. Left as-is; only pulling the essay-feedback one out here since
// that's the one that needs to be exported (for the account-settings page
// to read the number).
