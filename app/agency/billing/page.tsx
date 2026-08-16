import { createClient } from "@/lib/supabase/server";
import { getAgencyDashboardData } from "@/lib/agency-data";
import { createCheckoutSession, createPortalSession } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  inactive: "尚未開通",
  active: "使用中",
  past_due: "付款逾期",
  canceled: "已取消",
};
const STATUS_PILL: Record<string, string> = {
  inactive: "bg-slate-light text-slate",
  active: "bg-good-tint text-good",
  past_due: "bg-warn-tint text-warn",
  canceled: "bg-danger-tint text-danger",
};

const ERROR_MESSAGES: Record<string, string> = {
  stripe_not_configured: "付款系統尚未設定完成，請聯絡系統管理者設定 Stripe 價格 ID。",
  checkout_failed: "無法建立付款頁面，請稍後再試。",
  no_subscription_yet: "尚未有訂閱紀錄，請先完成一次付款設定。",
  use_add_seats_soon:
    "席次調整功能正在改版中，暫時請透過 info@nativeenglish.ca 聯絡我們調整席次，避免重複扣款。",
};

function formatCents(amount: number | null, currency: string | null) {
  if (amount === null) return "—";
  const value = amount / 100;
  return `${(currency || "usd").toUpperCase()} $${value.toLocaleString()}`;
}

export default async function AgencyBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkout?: string }>;
}) {
  const { error, checkout } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user!.id)
    .single();

  if (!profile?.agency_id) {
    return <p className="text-sm text-danger">此帳號尚未加入任何機構。</p>;
  }

  const { data: agency } = await supabase
    .from("agencies")
    .select(
      "name, stripe_customer_id, plan_status, standard_seats, premium_seats, current_period_end"
    )
    .eq("id", profile.agency_id)
    .single();

  const { data: invoices } = await supabase
    .from("billing_events")
    .select("id, amount_total, currency, status, hosted_invoice_url, created_at")
    .eq("agency_id", profile.agency_id)
    .order("created_at", { ascending: false });

  const { students } = await getAgencyDashboardData(supabase, profile.agency_id);

  const planStatus = agency?.plan_status || "inactive";
  const isConnected = !!agency?.stripe_customer_id;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">帳單與繳費</h1>
      <p className="text-sm text-slate mb-6">{agency?.name || "（尚未命名機構）"}</p>

      {checkout === "success" && (
        <div className="rounded border border-good/30 bg-good-tint text-good text-sm px-4 py-3 mb-6">
          付款設定完成，感謝您！方案資訊將於數秒內更新。
        </div>
      )}
      {checkout === "canceled" && (
        <div className="rounded border border-warn/30 bg-warn-tint text-ink text-sm px-4 py-3 mb-6">
          已取消本次付款流程，未產生任何費用。
        </div>
      )}
      {error && (
        <div className="rounded border border-danger/30 bg-danger-tint text-danger text-sm px-4 py-3 mb-6">
          {ERROR_MESSAGES[error] || "發生錯誤，請稍後再試。"}
        </div>
      )}

      {!isConnected && (
        <div className="rounded border border-warn/30 bg-warn-tint text-ink text-sm px-4 py-3 mb-6">
          <b className="text-warn">尚未連接真實付款系統。</b>{" "}
          完成下方付款設定後，這裡會顯示您機構真實的方案狀態、席次與帳單紀錄。
        </div>
      )}

      <div className="rounded border border-line bg-surface shadow-card p-5 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="font-display text-lg font-bold">目前方案</div>
            <div className="text-sm text-slate">標準版機構授權</div>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_PILL[planStatus]}`}
          >
            {STATUS_LABEL[planStatus]}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-4 text-sm mb-5">
          <div>
            <div className="text-xs text-slate mb-1">標準席次</div>
            <div className="font-display text-lg font-bold">{agency?.standard_seats ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-slate mb-1">進階席次</div>
            <div className="font-display text-lg font-bold">{agency?.premium_seats ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-slate mb-1">目前學生數</div>
            <div className="font-display text-lg font-bold">{students.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate mb-1">下次續約日</div>
            <div className="font-display text-lg font-bold">
              {agency?.current_period_end
                ? new Date(agency.current_period_end).toLocaleDateString("zh-TW")
                : "—"}
            </div>
          </div>
        </div>

        {isConnected ? (
          <div className="rounded border border-line bg-slate-light/40 px-4 py-3 text-sm text-slate mb-3">
            席次調整（新增、升級、7 天內取消）功能即將推出。目前如需調整席次數量，請聯絡
            info@nativeenglish.ca，由我們手動處理，避免系統重複建立訂閱造成重複扣款。
          </div>
        ) : (
          <form action={createCheckoutSession} className="flex flex-wrap items-end gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate mb-1">標準席次數量</label>
              <input
                name="standard_seats"
                type="number"
                min={0}
                defaultValue={agency?.standard_seats || students.length}
                className="w-28 rounded border border-line px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">進階席次數量</label>
              <input
                name="premium_seats"
                type="number"
                min={0}
                defaultValue={agency?.premium_seats || 0}
                className="w-28 rounded border border-line px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white"
            >
              開始訂閱
            </button>
          </form>
        )}

        {isConnected && (
          <form action={createPortalSession}>
            <button type="submit" className="text-xs text-brand underline">
              管理付款方式、發票與訂閱設定
            </button>
          </form>
        )}
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
