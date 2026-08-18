import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAgencyDashboardData } from "@/lib/agency-data";
import { createCheckoutSession, createPortalSession } from "./actions";
import { addSeats } from "@/app/actions/seats";
import { admissionCycleOptions } from "@/lib/seats";

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
  use_add_seats_soon: "請使用下方「新增席次」，避免重複建立訂閱。",
  nothing_to_add: "請輸入至少一個要新增的席次數量。",
  invalid_admission_cycle: "請選擇有效的入學年度。",
  license_inactive: "貴機構的授權訂閱目前未生效（已取消或付款逾期），所有學生帳號暫時僅能檢視。",
  seats_inactive: "貴機構的席次訂閱目前未生效（已取消或付款逾期），所有學生帳號暫時僅能檢視。",
};

function formatCents(amount: number | null, currency: string | null) {
  if (amount === null) return "—";
  const value = amount / 100;
  return `${(currency || "usd").toUpperCase()} $${value.toLocaleString()}`;
}

export default async function AgencyBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkout?: string; seat_action?: string }>;
}) {
  const { error, checkout, seat_action } = await searchParams;
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
      "name, stripe_customer_id, plan_status, standard_seats, premium_seats, current_period_end, seats_plan_status, seats_current_period_end"
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
      {seat_action === "added" && (
        <div className="rounded border border-good/30 bg-good-tint text-good text-sm px-4 py-3 mb-6">
          席次新增成功。前往
          <Link href="/agency/students/new" className="underline mx-1">
            新增學生
          </Link>
          即可將新席次指派給學生。
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

      {/* Rules shown plainly before any purchase, not just buried in a
          legal document — per Dan's explicit request. */}
      <div className="rounded border border-line bg-slate-light/40 p-4 mb-6 text-xs text-slate leading-relaxed">
        <b className="text-ink">席次規則（請詳閱）：</b>
        <ul className="list-disc list-inside mt-1 space-y-0.5">
          <li>席次可隨時「新增」；標準席次可隨時升級為進階席次，但<b>進階席次永遠無法降級為標準席次，沒有例外</b>。</li>
          <li>
            席次購買後 <b>7 天內、且完全尚未使用</b>
            （沒有任何學生資料輸入）可以取消並依比例退款。超過 7 天或已開始使用，一律無法取消，也沒有退款。
          </li>
          <li>每個席次都屬於特定的「入學年度」，於<b>該年 8 月 31 日到期</b>——例如 2026–2027 入學年度（學生 2027 年 9 月入學）的席次，會在 2027 年 8 月 31 日到期，與購買日期無關。到期後帳號自動轉為唯讀（無法新增內容，僅能檢視）。</li>
          <li>若席次在到期前完全未使用，可延續使用至隔年；除此之外沒有例外。</li>
          <li>機構封存學生帳號後，該席次<b>不會釋出重複使用</b>——如需服務其他學生，須另外購買新席次。</li>
          <li><b>無論任何席次是否仍在有效期內，只要貴機構的授權訂閱本身遭取消或付款逾期，所有學生帳號將立即轉為唯讀</b>，直到訂閱恢復為止。</li>
          <li>授權費（$2,000/年）與席次費用<b>分別計費、分別續約</b>，各自獨立扣款與取消，不會合併成單一總額。</li>
        </ul>
      </div>

      <div className="rounded border border-line bg-surface shadow-card p-5 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="font-display text-lg font-bold">目前方案</div>
            <div className="text-sm text-slate">
              標準版機構授權 · $2,000/年
              {isConnected && (
                <span
                  className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[agency?.seats_plan_status || "inactive"]}`}
                >
                  席次訂閱：{STATUS_LABEL[agency?.seats_plan_status || "inactive"]}
                </span>
              )}
            </div>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_PILL[planStatus]}`}
          >
            授權：{STATUS_LABEL[planStatus]}
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
            <div className="text-xs text-slate mb-1">授權續約日</div>
            <div className="font-display text-lg font-bold">
              {agency?.current_period_end
                ? new Date(agency.current_period_end).toLocaleDateString("zh-TW")
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate mb-1">席次續約日</div>
            <div className="font-display text-lg font-bold">
              {agency?.seats_current_period_end
                ? new Date(agency.seats_current_period_end).toLocaleDateString("zh-TW")
                : "—"}
            </div>
          </div>
        </div>
        <div className="text-xs text-slate mb-5">
          目前學生數：{students.length} ·{" "}
          <Link href="/agency/billing/students" className="text-brand underline">
            查看席次與學生名單 →
          </Link>
        </div>

        {!isConnected && (
          <form action={createCheckoutSession} className="flex flex-wrap items-end gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate mb-1">入學年度</label>
              <select
                name="admission_cycle_end_year"
                className="rounded border border-line px-2 py-1.5 text-sm"
                defaultValue={admissionCycleOptions()[1]?.value}
              >
                {admissionCycleOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
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
              開始訂閱（含 7 天免費試用）
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

      {isConnected && (
        <>
          <h3 className="font-display font-bold text-base mb-2">新增席次</h3>
          <div className="rounded border border-line bg-surface shadow-card p-5 mb-6">
            <form action={addSeats} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-slate mb-1">入學年度</label>
                <select
                  name="admission_cycle_end_year"
                  className="rounded border border-line px-2 py-1.5 text-sm"
                  defaultValue={admissionCycleOptions()[1]?.value}
                >
                  {admissionCycleOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate mb-1">新增標準席次</label>
                <input
                  name="standard_to_add"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="w-28 rounded border border-line px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate mb-1">新增進階席次</label>
                <input
                  name="premium_to_add"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="w-28 rounded border border-line px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white"
              >
                新增席次（依比例計費）
              </button>
            </form>
            <p className="text-xs text-slate mt-2">
              新增的席次會依剩餘訂閱期間比例計費，並立即從您的付款方式扣款。本次新增的所有席次將套用同一入學年度；如需不同年度，請分次新增。
            </p>
          </div>

          <div className="rounded border border-line bg-slate-light/40 p-4 mb-6 text-sm text-slate">
            個別席次的清單、指派、升級、取消與入學年度設定，現在都移到了
            <Link href="/agency/students" className="text-brand underline mx-1">
              學生總覽
            </Link>
            頁面（尚未分配的席次會顯示在該頁最上方）。這裡的「查看席次與學生名單」則提供一份純檢視用的席次數量與學生總表。
          </div>
        </>
      )}

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
