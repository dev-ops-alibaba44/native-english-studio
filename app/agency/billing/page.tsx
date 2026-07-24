import { createClient } from "@/lib/supabase/server";
import { getAgencyDashboardData } from "@/lib/agency-data";

export default async function AgencyBillingPage() {
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
    .select("name")
    .eq("id", profile.agency_id)
    .single();

  const { students } = await getAgencyDashboardData(supabase, profile.agency_id);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">帳單與繳費</h1>
      <p className="text-sm text-slate mb-6">{agency?.name || "（尚未命名機構）"}</p>

      <div className="rounded border border-warn/30 bg-warn-tint text-ink text-sm px-4 py-3 mb-6">
        <b className="text-warn">尚未連接真實付款系統。</b>{" "}
        以下是畫面預覽 — 實際扣款、發票與付款方式將在串接 Stripe 之後開始運作。目前僅顯示您帳戶中真實的席次數量。
      </div>

      <div className="rounded border border-line bg-surface shadow-card p-5 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="font-display text-lg font-bold">目前方案</div>
            <div className="text-sm text-slate">標準版機構授權</div>
          </div>
          <button
            disabled
            className="rounded bg-slate-light text-slate px-4 py-2 text-sm font-semibold cursor-not-allowed"
            title="Stripe 尚未連接"
          >
            升級方案 / 新增席次
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate mb-1">機構年度授權費</div>
            <div className="font-display text-lg font-bold">$2,000</div>
          </div>
          <div>
            <div className="text-xs text-slate mb-1">已啟用席次</div>
            <div className="font-display text-lg font-bold">{students.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate mb-1">下次續約日</div>
            <div className="font-display text-lg font-bold">—</div>
          </div>
        </div>
      </div>

      <h3 className="font-display font-bold text-base mb-2">帳單紀錄</h3>
      <div className="rounded border border-line bg-surface shadow-card p-8 text-center text-sm text-slate mb-6">
        尚無帳單紀錄。連接 Stripe 之後，這裡會顯示每一筆發票與付款狀態。
      </div>

      <h3 className="font-display font-bold text-base mb-2">付款方式</h3>
      <div className="rounded border border-line bg-surface shadow-card p-8 text-center text-sm text-slate">
        尚未設定付款方式。
      </div>
    </div>
  );
}
