import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SEAT_STATUS_LABEL, SEAT_STATUS_PILL } from "@/lib/seats";

// Batch 23: replaces the removed 席次清單 section on the main billing
// page. That section mixed seat-level management actions (cancel /
// upgrade / set admission cycle) with a status list — the actions moved
// to /agency/students, and this page is what's left: a plain, read-only
// view of how many seats the agency has bought (by type and status) and
// the full roster of students it has manually signed up, with the
// identity details Dan specifically asked for (EN/CN names, DOB) that
// don't belong on a public-facing students list elsewhere in the app.
export default async function AgencyBillingStudentsPage() {
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

  const { data: seats } = await supabase
    .from("seats")
    .select("id, seat_type, status")
    .eq("agency_id", profile.agency_id);

  const allSeats = seats || [];
  const standardCount = allSeats.filter((s) => s.seat_type === "standard").length;
  const premiumCount = allSeats.filter((s) => s.seat_type === "premium").length;
  const statusCounts = (["unused", "active", "archived", "expired", "canceled"] as const).map(
    (status) => ({
      status,
      count: allSeats.filter((s) => s.status === status).length,
    })
  );

  const { data: studentsRaw } = await supabase
    .from("profiles")
    .select(
      "id, display_name, chinese_name, legal_first_name, legal_last_name, birthdate, email, is_archived"
    )
    .eq("agency_id", profile.agency_id)
    .eq("role", "student")
    .order("display_name");

  const students = studentsRaw || [];

  return (
    <div>
      <Link href="/agency/billing" className="text-xs text-slate mb-3 inline-block">
        ← 回到帳單與繳費
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">席次與學生名單</h1>
      <p className="text-sm text-slate mb-6">
        純檢視頁面——如需指派席次、升級、取消或設定入學年度，請至
        <Link href="/agency/students" className="text-brand underline mx-1">
          學生總覽
        </Link>
        。如需新增學生帳號，請至
        <Link href="/agency/students/new" className="text-brand underline mx-1">
          新增學生
        </Link>
        。
      </p>

      <h3 className="font-display font-bold text-base mb-2">已購買席次數量</h3>
      <div className="rounded border border-line bg-surface shadow-card p-5 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm mb-5">
          <div>
            <div className="text-xs text-slate mb-1">標準席次總數</div>
            <div className="font-display text-lg font-bold">{standardCount}</div>
          </div>
          <div>
            <div className="text-xs text-slate mb-1">進階席次總數</div>
            <div className="font-display text-lg font-bold">{premiumCount}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {statusCounts.map(({ status, count }) => (
            <span
              key={status}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SEAT_STATUS_PILL[status]}`}
            >
              {SEAT_STATUS_LABEL[status]}：{count}
            </span>
          ))}
        </div>
      </div>

      <h3 className="font-display font-bold text-base mb-2">學生名單（{students.length}）</h3>
      {students.length === 0 ? (
        <div className="rounded border border-line bg-surface shadow-card p-8 text-center text-sm text-slate">
          尚無已建立的學生帳號。
        </div>
      ) : (
        <div className="rounded border border-line bg-surface shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-slate">
                <th className="px-4 py-2.5 font-medium">中文姓名</th>
                <th className="px-4 py-2.5 font-medium">英文姓名</th>
                <th className="px-4 py-2.5 font-medium">出生日期</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {students.map((s: any) => {
                const legalFullName = [s.legal_first_name, s.legal_last_name]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5">{s.chinese_name || "—"}</td>
                    <td className="px-4 py-2.5">{legalFullName || "—"}</td>
                    <td className="px-4 py-2.5">{s.birthdate || "—"}</td>
                    <td className="px-4 py-2.5">{s.email || "—"}</td>
                    <td className="px-4 py-2.5">
                      {s.is_archived ? (
                        <span className="text-xs font-semibold text-slate">已封存</span>
                      ) : (
                        <span className="text-xs font-semibold text-good">使用中</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
