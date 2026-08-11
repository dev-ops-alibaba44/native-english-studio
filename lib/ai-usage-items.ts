import { type AiUsageItem } from "@/components/AiUsageOverview";
import { getEssayFeedbackUsage } from "@/app/actions/ai-feedback";
import { getBrainstormUsageToday } from "@/app/actions/brainstorm";
import { getProfileAssessmentUsage } from "@/app/actions/profile-assessment";
import { createAdminClient } from "@/lib/supabase/admin";

// Batch 9.20: pulled out of student/account/page.tsx so advisor/agency
// portfolio pages (which now also show a student's AI usage — Dan's
// request 1/1a) build the exact same three numbers the student sees on
// their own account page, rather than a second hand-maintained copy that
// could quietly drift from it.
export async function getAiUsageItems(studentId: string): Promise<AiUsageItem[]> {
  const [essayUsage, brainstormUsage, profileAssessmentUsage] = await Promise.all([
    getEssayFeedbackUsage(studentId),
    getBrainstormUsageToday(studentId),
    getProfileAssessmentUsage(studentId),
  ]);

  return [
    {
      key: "essay",
      label: "🤖 AI 回饋（所有申請項目合計）",
      used: essayUsage.used,
      limit: essayUsage.limit,
      helperText: "過去 30 天內，跨所有文書項目的 AI 回饋次數總和。額度會隨時間自然捲動釋出，不是固定在每月 1 號重置。",
    },
    {
      key: "brainstorm",
      label: "💬 AI 腦力激盪（今日）",
      used: brainstormUsage.used,
      limit: brainstormUsage.limit,
      helperText: "每天午夜（伺服器時間）重置。",
    },
    {
      key: "profile_assessment",
      label: "📊 AI 綜合評估（學習檔案）",
      used: profileAssessmentUsage.used,
      limit: profileAssessmentUsage.limit,
      helperText:
        "過去 30 天內的產生次數。資料完全沒有變動時重新產生不會另外計入，只有真正產生新內容才會使用到這個額度。",
    },
  ];
}

function rollingMonthStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Agency-wide totals (Dan's request 1a — "the Agency should DEFINITELY
// be able to monitor... the overall AI usage by the Agency"). Deliberately
// just visibility, not a cap — there's no per-agency limit to check
// against yet, only the per-student ones already enforced elsewhere.
// Uses the admin client since this is a genuine cross-student aggregate,
// not something any single RLS policy is meant to answer.
export async function getAgencyAiUsageTotals(agencyId: string): Promise<{
  essayFeedback30d: number;
  brainstormToday: number;
  profileAssessment30d: number;
  studentCount: number;
}> {
  const admin = createAdminClient();

  const { data: students } = await admin.from("profiles").select("id").eq("agency_id", agencyId).eq("role", "student");
  const studentIds = (students || []).map((s) => s.id);

  if (studentIds.length === 0) {
    return { essayFeedback30d: 0, brainstormToday: 0, profileAssessment30d: 0, studentCount: 0 };
  }

  const [{ count: essayFeedback30d }, { count: brainstormToday }, { count: profileAssessment30d }] = await Promise.all([
    admin
      .from("ai_feedback_log")
      .select("id", { count: "exact", head: true })
      .in("student_id", studentIds)
      .gte("created_at", rollingMonthStart().toISOString()),
    admin
      .from("brainstorm_usage_log")
      .select("id", { count: "exact", head: true })
      .in("user_id", studentIds)
      .gte("created_at", todayStart().toISOString()),
    admin
      .from("profile_assessment_log")
      .select("id", { count: "exact", head: true })
      .in("student_id", studentIds)
      .gte("created_at", rollingMonthStart().toISOString()),
  ]);

  return {
    essayFeedback30d: essayFeedback30d ?? 0,
    brainstormToday: brainstormToday ?? 0,
    profileAssessment30d: profileAssessment30d ?? 0,
    studentCount: studentIds.length,
  };
}
