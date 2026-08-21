import { createClient } from "@/lib/supabase/server";
import { syncParentAccountFromStripe } from "@/lib/parent-billing";
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

function formatCents(amount: number | null, currency: string | null) {
  if (amount == null) return "—";
  const value = amount / 100;
  return `${(currency || "usd").toUpperCase()} ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
  })}`;
}

export default async function ParentBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkout?: string; session_id?: string }>;
}) {
  const { error, checkout, session_id } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Batch 28 fix: reconcile with Stripe directly rather than only ever
  // trusting whatever the webhook last wrote — see lib/parent-billing.ts
  // for why. Cheap (a couple of Stripe API calls) and only runs on this
  // page's own load, so it doesn't slow down anything else.
  await syncParentAccountFromStripe(user!.id, session_id || null);

  const { data: parentAccount } = await supabase
    .from("parent_accounts")
    .select("plan_status, trial_ends_at, current_period_end, trial_ai_calls_used")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: invoices } = await supabase
    .from("parent_billing_events")
    .select("id, amount_total, currency, status, hosted_invoice_url, created_at")
    .eq("parent_id", user!.id)
    .order("created_at", { ascending: false });

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

      <h3 className="font-display font-bold text-base mb-2">帳單紀錄</h3>
      {!invoices || invoices.length === 0 ? (
        <div className="rounded border border-line bg-surface shadow-card p-8 text-center text-sm text-slate mb-6">
          尚無帳單紀錄。
        </div>
      ) : (
        <div className="rounded border border-line bg-surface shadow-card divide-y divide-line mb-6">
          {invoices.map((inv) => (
            <div key={inv.id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <div className="font-semibold">
                  {new Date(inv.created_at).toLocaleDateString("zh-TW")}
                </div>
                <div className="text-xs text-slate">{inv.status}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold">
                  {formatCents(inv.amount_total, inv.currency)}
                </span>
                {inv.hosted_invoice_url && (
                  <a
                    href={inv.hosted_invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand underline"
                  >
                    查看發票
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate">
        付款方式由 Stripe 安全託管，點選上方「管理付款方式」即可新增/更換信用卡。
      </p>
    </div>
  );
}
