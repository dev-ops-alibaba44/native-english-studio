import { createClient } from "@/lib/supabase/server";
import { getOrgCostSummary, isAdminApiConfigured } from "@/lib/anthropic-admin";

export default async function SuperAdminUsagePage() {
  const supabase = await createClient();

  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 30);

  const [{ count: feedbackCalls }, { count: brainstormCalls }, { count: assessmentCalls }, { count: chatbotTurns }] =
    await Promise.all([
      supabase
        .from("ai_feedback_log")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since30d.toISOString()),
      supabase
        .from("brainstorm_usage_log")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since30d.toISOString()),
      supabase
        .from("profile_assessment_log")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since30d.toISOString()),
      supabase
        .from("chatbot_messages")
        .select("id", { count: "exact", head: true })
        .eq("role", "assistant")
        .gte("created_at", since30d.toISOString()),
    ]);

  // Rough revenue estimate — agencies' manually-tracked annual fees
  // (batch13) divided across a year, as a sanity-check reference point
  // next to actual AI spend. NOT real revenue — there's no Stripe data
  // yet, so this is agencies' self-reported/Dan-entered numbers only.
  const { data: agencies } = await supabase
    .from("agencies")
    .select("annual_fee_usd")
    .eq("plan_status", "active");
  const monthlyRevenueEstimate =
    (agencies ?? []).reduce((sum, a) => sum + (a.annual_fee_usd ?? 0), 0) / 12;

  const adminConfigured = isAdminApiConfigured();
  let costError: string | null = null;
  let cost: Awaited<ReturnType<typeof getOrgCostSummary>> | null = null;
  if (adminConfigured) {
    try {
      cost = await getOrgCostSummary(30);
    } catch (err) {
      costError = err instanceof Error ? err.message : "unknown_error";
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">AI 使用量與成本</h1>
      <p className="mt-1 text-sm text-slate">過去 30 天。</p>

      <div className="mt-8">
        <h2 className="font-display text-sm font-bold text-ink">平台內各功能使用次數</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "文書 AI 回饋", value: feedbackCalls ?? 0 },
            { label: "AI 腦力激盪", value: brainstormCalls ?? 0 },
            { label: "學習檔案 AI 評估", value: assessmentCalls ?? 0 },
            { label: "首頁聊天機器人回覆", value: chatbotTurns ?? 0 },
          ].map((s) => (
            <div key={s.label} className="rounded border border-line bg-surface p-4 shadow-card">
              <div className="text-xl font-bold text-ink">{s.value}</div>
              <div className="mt-1 text-xs text-slate">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="font-display text-sm font-bold text-ink">
          Anthropic 組織整體花費（Claude API 實際支出）
        </h2>

        {!adminConfigured && (
          <div className="mt-3 rounded border border-warn/30 bg-warn-tint p-4 text-sm text-ink">
            尚未設定 <code className="text-xs">ANTHROPIC_ADMIN_API_KEY</code>，無法顯示實際花費。
            請參考本次交付訊息中「如何取得 Admin API 金鑰」的步驟設定後，這裡會自動顯示資料。
          </div>
        )}

        {adminConfigured && costError && (
          <div className="mt-3 rounded border border-danger/30 bg-danger-tint p-4 text-sm text-ink">
            呼叫 Anthropic Admin API 時發生錯誤：{costError}
            <br />
            請確認金鑰是否為 Admin Key（以 sk-ant-admin 開頭）且尚未過期。
          </div>
        )}

        {cost && (
          <>
            <div className="mt-3 rounded border border-line bg-surface p-5 shadow-card">
              <div className="text-2xl font-bold text-ink">
                ${cost.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-1 text-xs text-slate">
                過去 30 天實際 API 花費（USD，來自 Anthropic Admin API）
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded border border-line">
              <table className="w-full text-sm">
                <thead className="bg-ink text-white">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">項目</th>
                    <th className="px-4 py-2 text-left font-medium">花費（USD）</th>
                  </tr>
                </thead>
                <tbody>
                  {cost.byDescription.map((row) => (
                    <tr key={row.label} className="border-t border-line bg-surface">
                      <td className="px-4 py-2">{row.label}</td>
                      <td className="px-4 py-2">${row.usd.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 rounded border border-line bg-brand-tint p-5 text-sm text-ink">
              <p className="font-semibold">粗略毛利估算（僅供參考）</p>
              <p className="mt-1 text-slate">
                依「機構列表」中手動輸入的年費估算月營收：約 $
                {monthlyRevenueEstimate.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}{" "}
                USD/月，對比過去 30 天實際 AI 花費 $
                {cost.totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD。
                <br />
                這不是真正的毛利率——沒有計入 Stripe 實際收款、機構試用期、個人訂閱、其他營運成本，僅供您粗略判斷 AI 成本是否在合理範圍內。Stripe 串接後可以算出更準確的數字。
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
