import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAgencyDashboardData } from "@/lib/agency-data";
import { advisorStatus, utilizationPct } from "@/lib/capacity";
import { updateCapacity } from "./actions";

const STATUS_PILL: Record<string, string> = {
  available: "bg-good-tint text-good",
  near: "bg-warn-tint text-warn",
  overloaded: "bg-danger-tint text-danger",
};
const BAR_COLOR: Record<string, string> = {
  available: "bg-good",
  near: "bg-warn",
  overloaded: "bg-danger",
};

const ERROR_MESSAGES: Record<string, string> = {
  capacity_failed: "無法更新承接上限，請稍後再試。",
  capacity_invalid: "承接上限必須是大於 0 的數字。",
};

const SUCCESS_MESSAGES: Record<string, string> = {
  advisor_created: "顧問帳號已建立，邀請信已寄出。",
};

export default async function AgencyCapacityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
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

  const { advisors } = await getAgencyDashboardData(supabase, profile.agency_id);

  const sorted = [...advisors].sort(
    (a, b) => b.capacity - b.caseload - (a.capacity - a.caseload)
  );
  const topPicks = sorted.filter((a) => a.capacity - a.caseload > 0).slice(0, 2);
  const overloaded = sorted.filter((a) => advisorStatus(a.caseload, a.capacity, a.overdueCount).status === "overloaded");

  return (
    <div>
      <Link href="/agency" className="text-xs text-slate mb-3 inline-block">
        ← 回到機構總覽
      </Link>
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="font-display text-2xl font-bold text-ink">顧問產能</h1>
        <Link
          href="/agency/advisors/new"
          className="shrink-0 rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white"
        >
          + 新增顧問
        </Link>
      </div>
      <p className="text-sm text-slate mb-6">
        依「可承接空間」排序 — 一眼看出誰還能接、誰已經滿載。
      </p>

      {success && (
        <div className="rounded border border-good/30 bg-good-tint text-good text-sm px-4 py-3 mb-6">
          {SUCCESS_MESSAGES[success] || "操作成功！"}
        </div>
      )}
      {error && (
        <div className="rounded border border-danger/30 bg-danger-tint text-danger text-sm px-4 py-3 mb-6">
          {ERROR_MESSAGES[error] || "發生錯誤，請稍後再試。"}
        </div>
      )}

      {(topPicks.length > 0 || overloaded.length > 0) && (
        <div className="rounded-xl border border-good/20 bg-good-tint p-5 mb-6">
          {topPicks.length > 0 && (
            <p className="text-sm mb-1">
              <b className="text-good">
                建議優先指派給：{topPicks.map((a) => a.display_name).join("、")}。
              </b>
            </p>
          )}
          {overloaded.length > 0 && (
            <p className="text-sm text-ink">
              {overloaded.map((a) => a.display_name).join("、")} 目前已超載，暫不建議再指派新學生
              {overloaded.some((a) => a.overdueCount > 0) && "，且有逾期項目待處理"}。
            </p>
          )}
        </div>
      )}

      <div className="rounded border border-line bg-surface shadow-card divide-y divide-line">
        {sorted.length === 0 ? (
          <p className="p-4 text-sm text-slate">目前還沒有顧問。</p>
        ) : (
          sorted.map((a) => {
            const s = advisorStatus(a.caseload, a.capacity, a.overdueCount);
            const pct = utilizationPct(a.caseload, a.capacity);
            return (
              <div key={a.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Link
                    href={`/agency/students?advisor=${a.id}`}
                    className="font-semibold text-sm text-ink hover:text-brand hover:underline"
                  >
                    {a.display_name}
                  </Link>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_PILL[s.status]}`}>
                    {s.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 h-2 rounded-full bg-slate-light overflow-hidden">
                    <div
                      className={`h-full rounded-full ${BAR_COLOR[s.status]}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate w-10 text-right">{pct}%</div>
                </div>
                <div className="text-xs text-slate mb-3">
                  {a.caseload} / {a.capacity} 位學生
                  {a.overdueCount > 0 && (
                    <span className="text-danger font-semibold ml-2">
                      {a.overdueCount} 項逾期
                    </span>
                  )}
                </div>
                <form
                  action={updateCapacity.bind(null, a.id)}
                  className="flex items-center gap-2"
                >
                  <label className="text-xs text-slate" htmlFor={`capacity-${a.id}`}>
                    承接上限：
                  </label>
                  <input
                    id={`capacity-${a.id}`}
                    name="capacity"
                    type="number"
                    min={1}
                    defaultValue={a.capacity}
                    className="w-20 rounded border border-line px-2 py-1 text-xs"
                  />
                  <button
                    type="submit"
                    className="rounded bg-ink px-3 py-1 text-xs font-semibold text-white"
                  >
                    儲存
                  </button>
                </form>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
