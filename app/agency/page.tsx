import { createClient } from "@/lib/supabase/server";
import { getAgencyDashboardData } from "@/lib/agency-data";
import { advisorStatus, utilizationPct } from "@/lib/capacity";

const STATUS_PILL: Record<string, string> = {
  available: "bg-good-tint text-good",
  near: "bg-warn-tint text-warn",
  overloaded: "bg-danger-tint text-danger",
};

export default async function AgencyOverviewPage() {
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

  const { advisors, students, totalOverdue } = await getAgencyDashboardData(
    supabase,
    profile.agency_id
  );

  const sortedByRoom = [...advisors].sort(
    (a, b) => b.capacity - b.caseload - (a.capacity - a.caseload)
  );
  const totalRoom = advisors.reduce((sum, a) => sum + Math.max(0, a.capacity - a.caseload), 0);
  const topPicks = sortedByRoom.filter((a) => a.capacity - a.caseload > 0).slice(0, 2);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">機構總覽</h1>
      <p className="text-sm text-slate mb-6">{agency?.name || "（尚未命名機構）"} · 整體營運狀況一覽。</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded border border-line bg-surface shadow-card p-5">
          <div className="text-xs font-semibold text-slate mb-2">顧問人數</div>
          <div className="font-display text-3xl font-bold">{advisors.length}</div>
          <div className="text-xs text-slate mt-1">管理 {students.length} 位學生</div>
        </div>
        <div className="rounded border border-line bg-surface shadow-card p-5">
          <div className="text-xs font-semibold text-slate mb-2">學生人數</div>
          <div className="font-display text-3xl font-bold">{students.length}</div>
        </div>
        <div className="rounded border border-line bg-surface shadow-card p-5">
          <div className="text-xs font-semibold text-slate mb-2">目前已逾期文書</div>
          <div className="font-display text-3xl font-bold text-danger">{totalOverdue}</div>
        </div>
      </div>

      {topPicks.length > 0 && (
        <div className="rounded-xl border border-good/20 bg-good-tint p-5 mb-6">
          <p className="text-sm">
            <b className="text-good">
              團隊目前約有 {totalRoom} 個新學生的承接空間。
            </b>
          </p>
          <p className="text-sm text-ink mt-1">
            {topPicks.map((a) => a.display_name).join("、")}{" "}
            的產能使用率最低，是優先指派新學生的人選。詳見「顧問產能」。
          </p>
        </div>
      )}

      <h3 className="font-display font-bold text-base mb-2">顧問狀態快照</h3>
      <div className="rounded border border-line bg-surface shadow-card divide-y divide-line">
        {advisors.length === 0 ? (
          <p className="p-4 text-sm text-slate">目前還沒有顧問。</p>
        ) : (
          sortedByRoom.map((a) => {
            const s = advisorStatus(a.caseload, a.capacity, a.overdueCount);
            return (
              <div key={a.id} className="flex items-center justify-between p-4">
                <div className="font-semibold text-sm">{a.display_name}</div>
                <div className="text-xs text-slate">
                  {a.caseload} / {a.capacity} 位學生 · 使用率 {utilizationPct(a.caseload, a.capacity)}%
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_PILL[s.status]}`}>
                  {s.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
