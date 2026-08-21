import { createClient } from "@/lib/supabase/server";
import { createParentPortalSession } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  inactive: "尚未開通",
  trialing: "試用中",
  active: "使用中",
  past_due: "付款逾期",
  canceled: "已取消",
};
const STATUS_PILL: Record<string, string> = {
  inactive: "bg-slate-light text-slate",
  trialing: "bg-warn-tint text-warn",
  active: "bg-good-tint text-good",
  past_due: "bg-warn-tint text-warn",
  canceled: "bg-danger-tint text-danger",
};

const ERROR_MESSAGES: Record<string, string> = {
  no_subscription_yet: "尚未有訂閱紀錄。",
};

export default async function ParentBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkout?: string }>;
}) {
  const { error, checkout } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: parentAccount } = await supabase
    .from("parent_accounts")
    .select("plan_status, trial_ends_at, current_period_end, trial_ai_calls_used")
    .eq("id", user!.id)
    .maybeSingle();

  const status = parentAccount?.plan_status || "inactive";

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">帳單與訂閱</h1>
      <p className="text-sm text-slate mb-6">管理付款方式、查看帳單紀錄，或取消訂閱。</p>

      {checkout === "success" && (
        <div className="rounded border border-good/30 bg-good-tint text-good text-sm px-4 py-3 mb-6">
          付款設定完成！
        </div>
      )}
      {error && (
        <div className="rounded border border-danger/30 bg-danger-tint text-danger text-sm px-4 py-3 mb-6">
          {ERROR_MESSAGES[error] || "發生錯誤，請稍後再試。"}
        </div>
      )}

      <div className="rounded border border-line bg-surface shadow-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate">訂閱狀態</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_PILL[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>

        {status === "trialing" && parentAccount?.trial_ends_at && (
          <div className="rounded border border-warn/30 bg-warn-tint p-3 mb-3 text-xs text-ink leading-relaxed">
            試用期將於 <b>{new Date(parentAccount.trial_ends_at).toLocaleDateString("zh-TW")}</b>{" "}
            結束並開始扣款。若在此之前取消訂閱，帳號與所有子女資料將會<b>立即且永久刪除，無法復原</b>
            。試用期間 AI 功能使用次數：{parentAccount.trial_ai_calls_used} / 20。
          </div>
        )}

        {parentAccount?.current_period_end && (
          <p className="text-xs text-slate mb-3">
            {status === "trialing" ? "試用結束後下次扣款日" : "下次扣款日"}：
            {new Date(parentAccount.current_period_end).toLocaleDateString("zh-TW")}
          </p>
        )}

        <form action={createParentPortalSession}>
          <button
            type="submit"
            className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            管理付款方式 / 查看帳單 / 取消訂閱
          </button>
        </form>
      </div>
    </div>
  );
}
