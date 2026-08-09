import { createClient } from "@/lib/supabase/server";
import { AiUsageOverview, type AiUsageItem } from "@/components/AiUsageOverview";
import { getEssayFeedbackUsage } from "@/app/actions/ai-feedback";
import { getBrainstormUsageToday } from "@/app/actions/brainstorm";
import { getProfileAssessmentUsage } from "@/app/actions/profile-assessment";

export default async function StudentAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .single();

  // Batch 9.17: added profile-assessment usage here — it already had a
  // real server-side cap (Batch 9.16, MONTHLY_PROFILE_ASSESSMENT_LIMIT)
  // but was never actually shown anywhere, so a student had no way to
  // know it existed until they hit it.
  const [essayUsage, brainstormUsage, profileAssessmentUsage] = await Promise.all([
    getEssayFeedbackUsage(user!.id),
    getBrainstormUsageToday(user!.id),
    getProfileAssessmentUsage(user!.id),
  ]);

  const usageItems: AiUsageItem[] = [
    {
      key: "essay",
      label: "🤖 AI 回饋（所有申請項目合計）",
      used: essayUsage.used,
      limit: essayUsage.limit,
      helperText: "過去 30 天內，跨你所有文書項目的 AI 回饋次數總和。額度會隨時間自然捲動釋出，不是固定在每月 1 號重置。",
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

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">帳號設定</h1>
      <p className="text-sm text-slate mb-6">{profile?.display_name}</p>

      <h2 className="font-display font-bold text-base mb-3">AI 使用量</h2>
      <div className="max-w-md">
        <AiUsageOverview items={usageItems} />
      </div>
    </div>
  );
}
