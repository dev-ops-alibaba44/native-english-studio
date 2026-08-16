import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  trial: "試用中",
  active: "使用中",
  past_due: "逾期未繳",
  cancelled: "已取消",
};

const STATUS_COLORS: Record<string, string> = {
  trial: "bg-brand-tint text-brand",
  active: "bg-good-tint text-good",
  past_due: "bg-danger-tint text-danger",
  cancelled: "bg-surface text-slate",
};

export default async function SuperAdminAgenciesPage() {
  const supabase = await createClient();

  const { data: agencies } = await supabase
    .from("agencies")
    .select("id, name, created_at, plan_status, annual_fee_usd, plan_notes")
    .order("created_at", { ascending: false });

  // One extra query for seat counts — small number of agencies, so N+1
  // here is fine rather than a more complex aggregate join.
  const agenciesWithCounts = await Promise.all(
    (agencies ?? []).map(async (a) => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", a.id)
        .eq("role", "student");
      return { ...a, studentCount: count ?? 0 };
    })
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">機構列表</h1>
      <p className="mt-1 text-sm text-slate">
        使用平台的所有機構。費用欄位為手動輸入的參考紀錄，尚未與 Stripe 串接。
      </p>

      <div className="mt-6 overflow-hidden rounded border border-line">
        <table className="w-full text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">機構名稱</th>
              <th className="px-4 py-2.5 text-left font-medium">學生人數</th>
              <th className="px-4 py-2.5 text-left font-medium">方案狀態</th>
              <th className="px-4 py-2.5 text-left font-medium">年費（USD）</th>
              <th className="px-4 py-2.5 text-left font-medium">加入時間</th>
            </tr>
          </thead>
          <tbody>
            {agenciesWithCounts.map((a) => (
              <tr key={a.id} className="border-t border-line bg-surface">
                <td className="px-4 py-3">
                  <Link
                    href={`/super-admin/agencies/${a.id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {a.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{a.studentCount}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[a.plan_status] ?? "bg-surface text-slate"
                    }`}
                  >
                    {STATUS_LABELS[a.plan_status] ?? a.plan_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {a.annual_fee_usd != null ? `$${a.annual_fee_usd.toLocaleString()}` : "—"}
                </td>
                <td className="px-4 py-3 text-slate">
                  {new Date(a.created_at).toLocaleDateString("zh-TW")}
                </td>
              </tr>
            ))}
            {agenciesWithCounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate">
                  尚無機構資料。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
