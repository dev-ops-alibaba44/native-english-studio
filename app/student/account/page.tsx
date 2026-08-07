import { createClient } from "@/lib/supabase/server";
import { UsageGauge } from "@/components/UsageGauge";
import { getEssayFeedbackUsage } from "@/app/actions/ai-feedback";
import { getBrainstormUsageToday } from "@/app/actions/brainstorm";

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

  const [essayUsage, brainstormUsage] = await Promise.all([
    getEssayFeedbackUsage(user!.id),
    getBrainstormUsageToday(user!.id),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">帳號設定</h1>
      <p className="text-sm text-slate mb-6">{profile?.display_name}</p>

      <h2 className="font-display font-bold text-base mb-3">AI 使用量</h2>
      <div className="flex flex-col gap-4 max-w-md">
        <UsageGauge
          label="🤖 AI 回饋（所有申請項目合計）"
          used={essayUsage.used}
          limit={essayUsage.limit}
          helperText="過去 30 天內，跨你所有文書項目的 AI 回饋次數總和。額度會隨時間自然捲動釋出，不是固定在每月 1 號重置。"
        />
        <UsageGauge
          label="💬 AI 腦力激盪（今日）"
          used={brainstormUsage.used}
          limit={brainstormUsage.limit}
          helperText="每天午夜（伺服器時間）重置。"
        />
      </div>
    </div>
  );
}
