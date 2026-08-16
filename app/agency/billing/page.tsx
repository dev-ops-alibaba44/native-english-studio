import { createClient } from "@/lib/supabase/server";
import { getAgencyDashboardData } from "@/lib/agency-data";
import { createCheckoutSession, createPortalSession } from "./actions";
import { addSeats, cancelSeat, upgradeSeat } from "@/app/actions/seats";

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

const SEAT_STATUS_LABEL: Record<string, string> = {
  unused: "尚未使用",
  active: "使用中",
  archived: "已封存",
  expired: "已到期",
  canceled: "已取消",
};
const SEAT_STATUS_PILL: Record<string, string> = {
  unused: "bg-slate-light text-slate",
  active: "bg-good-tint text-good",
  archived: "bg-slate-light text-slate line-through",
  expired: "bg-danger-tint text-danger",
  canceled: "bg-slate-light text-slate line-through",
};

const ERROR_MESSAGES: Record<string, string> = {
  stripe_not_configured: "付款系統尚未設定完成，請聯絡系統管理者設定 Stripe 價格 ID。",
  checkout_failed: "無法建立付款頁面，請稍後再試。",
  no_subscription_yet: "尚未有訂閱紀錄，請先完成一次付款設定。",
  use_add_seats_soon: "請使用下方「新增席次」，避免重複建立訂閱。",
  nothing_to_add: "請輸入至少一個要新增的席次數量。",
  seat_not_found: "找不到這個席次。",
  seat_not_cancelable: "此席次已被使用，無法取消——僅未使用的席次可在購買 7 天內取消。",
  seat_cancel_window_passed: "已超過購買後 7 天，此席次無法取消。",
  already_premium: "此席次已經是進階席次。",
  seat_not_upgradable: "此席次狀態無法升級。",
};

function formatCents(amount: number | null, currency: string | null) {
  if (amount === null) return "—";
  const value = amount / 100;
  return `${(currency || "usd").toUpperCase()} $${value.toLocaleString()}`;
}

function daysLeftToCancel(purchasedAt: string): number {
  const ageMs = Date.now() - new Date(purchasedAt).getTime();
  const daysLeft = 7 - Math.floor(ageMs / (24 * 60 * 60 * 1000));
  return Math.max(0, daysLeft);
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
      "name, stripe_customer_id, plan_status, standard_seats, premium_seats, current_period_end"
    )
    .eq("id", profile.agency_id)
    .single();

  const { data: invoices } = await supabase
    .from("billing_events")
    .select("id, amount_total, currency, status, hosted_invoice_url, created_at")
    .eq("agency_id", profile.agency_id)
    .order("created_at", { ascending: false });

  // Seats: read via the regular RLS-scoped client, same as everything
  // else on this page — writes only ever happen inside the server
  // actions in app/actions/seats.ts, via the admin client.
  const { data: seats } = await supabase
    .from("seats")
    .select("id, seat_type, status, assigned_student_id, purchased_at, expires_at")
    .eq("agency_id", profile.agency_id)
    .order("purchased_at", { ascending: false });

  const { students } = await getAgencyDashboardData(supabase, profile.agency_id);
  const studentNameById = new Map(students.map((s: any) => [s.id, s.display_name]));

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
          席次新增成功。
        </div>
      )}
      {seat_action === "canceled" && (
        <div className="rounded border border-good/30 bg-good-tint text-good text-sm px-4 py-3 mb-6">
          席次已取消，款項將依比例退還。
        </div>
      )}
      {seat_action === "upgraded" && (
        <div className="rounded border border-good/30 bg-good-tint text-good text-sm px-4 py-3 mb-6">
          席次已升級為進階席次。
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
          <li>席次可隨時「新增」；標準席次可隨時升級為進階席次，但進階席次無法降級為標準席次。</li>
          <li>
            席次購買後 <b>7 天內、且完全尚未使用</b>
            （沒有任何學生資料輸入）可以取消並依比例退款。超過 7 天或已開始使用，一律無法取消，也沒有退款。
          </li>
          <li>每個席次自購買日起 <b>365 天後到期</b>，到期後帳號自動轉為唯讀（無法新增內容，僅能檢視）。</li>
          <li>若席次在到期前完全未使用，可延續使用至隔年；除此之外沒有例外。</li>
          <li>機構封存學生帳號後，該席次<b>不會釋出重複使用</b>——如需服務其他學生，須另外購買新席次。</li>
        </ul>
      </div>

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

        {!isConnected && (
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
              新增的席次會依剩餘訂閱期間比例計費，並立即從您的付款方式扣款。
            </p>
          </div>

          <h3 className="font-display font-bold text-base mb-2">席次清單</h3>
          {!seats || seats.length === 0 ? (
            <div className="rounded border border-line bg-surface shadow-card p-8 text-center text-sm text-slate mb-6">
              尚無席次紀錄。
            </div>
          ) : (
            <div className="rounded border border-line bg-surface shadow-card divide-y divide-line mb-6">
              {seats.map((seat) => {
                const cancelDaysLeft = daysLeftToCancel(seat.purchased_at);
                const canCancel = seat.status === "unused" && cancelDaysLeft > 0;
                const canUpgrade =
                  seat.seat_type === "standard" &&
                  (seat.status === "unused" || seat.status === "active");
                return (
                  <div
                    key={seat.id}
                    className="p-4 flex items-center justify-between text-sm gap-3"
                  >
                    <div>
                      <div className="font-semibold">
                        {seat.seat_type === "premium" ? "進階席次" : "標準席次"}
                        {seat.assigned_student_id && (
                          <span className="text-slate font-normal">
                            {" "}
                            · {studentNameById.get(seat.assigned_student_id) || "（未知學生）"}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate">
                        購買於 {new Date(seat.purchased_at).toLocaleDateString("zh-TW")} · 到期於{" "}
                        {new Date(seat.expires_at).toLocaleDateString("zh-TW")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SEAT_STATUS_PILL[seat.status]}`}
                      >
                        {SEAT_STATUS_LABEL[seat.status]}
                      </span>
                      {canUpgrade && (
                        <form action={upgradeSeat.bind(null, seat.id)}>
                          <button type="submit" className="text-xs text-brand underline">
                            升級為進階
                          </button>
                        </form>
                      )}
                      {canCancel && (
                        <form action={cancelSeat.bind(null, seat.id)}>
                          <button type="submit" className="text-xs text-danger underline">
                            取消（剩 {cancelDaysLeft} 天可取消）
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
