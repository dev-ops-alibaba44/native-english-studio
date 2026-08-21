import { createAdminClient } from "@/lib/supabase/admin";

// Batch 27: abuse guard for the 7-day parent trial, per Dan's explicit
// requirement ("limited cap on AI usage during the 7-day trial, to
// prevent abuse"). A simple total-calls-during-trial counter — not
// per-day, since the whole trial is only 7 days and the point is
// stopping someone from running the AI features into the ground before
// ever paying, not rate-limiting normal use.
const TRIAL_AI_CALL_CAP = 20;

// Call this at the top of every AI action (brainstorm, feedback,
// profile assessment, etc.) before the actual Anthropic call, passing
// the STUDENT's id. For agency-linked students this is always a no-op
// (allowed=true) — the cap only applies to a student whose parent
// account is currently in an active trial.
export async function checkAndConsumeParentTrialAiQuota(
  studentId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const admin = createAdminClient();

  const { data: student } = await admin
    .from("profiles")
    .select("parent_id")
    .eq("id", studentId)
    .maybeSingle();

  if (!student?.parent_id) {
    return { allowed: true }; // agency-linked student, or no parent — not subject to this cap
  }

  const { data: parentAccount } = await admin
    .from("parent_accounts")
    .select("plan_status, trial_ai_calls_used")
    .eq("id", student.parent_id)
    .maybeSingle();

  if (!parentAccount || parentAccount.plan_status !== "trialing") {
    return { allowed: true }; // not in trial (either paid, or trial already ended) — no cap
  }

  if (parentAccount.trial_ai_calls_used >= TRIAL_AI_CALL_CAP) {
    return {
      allowed: false,
      reason: `7 天試用期間的 AI 使用次數已達上限（${TRIAL_AI_CALL_CAP} 次）。付款啟用正式帳號後即可恢復使用。`,
    };
  }

  await admin
    .from("parent_accounts")
    .update({ trial_ai_calls_used: parentAccount.trial_ai_calls_used + 1 })
    .eq("id", student.parent_id);

  return { allowed: true };
}
