import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StageThread } from "@/components/StageThread";
import { type Stage } from "@/lib/stages";
import { createApplicationFor } from "@/app/actions/applications";
import { sortApplicationsByDeadline, sortStudentsByDeadline } from "@/lib/deadlines";

const ERROR_MESSAGES: Record<string, string> = {
  missing_school_name: "請輸入學校名稱。",
  no_agency: "這位學生尚未加入任何機構。",
  school_failed: "無法建立學校資料，請稍後再試。",
  duplicate_school: "這位學生已經新增過這間學校的申請了。",
  application_failed: "無法建立申請項目，請稍後再試。",
};

export default async function AgencyStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ advisor?: string; error?: string; success?: string; sort?: string }>;
}) {
  const { advisor: advisorFilter, error, success, sort } = await searchParams;
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

  let studentsQuery = supabase
    .from("profiles")
    .select("id, display_name, primary_advisor_id, applications(id, stage, deadline, schools(name))")
    .eq("agency_id", profile.agency_id)
    .eq("role", "student")
    .order("display_name");

  if (advisorFilter) {
    studentsQuery = studentsQuery.eq("primary_advisor_id", advisorFilter);
  }

  const { data: studentsRaw } = await studentsQuery;
  const sortByDeadline = sort === "deadline";
  const students = sortByDeadline ? sortStudentsByDeadline(studentsRaw || []) : studentsRaw || [];

  // Preserve the advisor filter (if any) when switching sort mode.
  const sortLinkSuffix = advisorFilter ? `&advisor=${advisorFilter}` : "";

  const { data: advisorsList } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("agency_id", profile.agency_id)
    .eq("role", "advisor");

  const advisorNameById = new Map((advisorsList || []).map((a) => [a.id, a.display_name]));
  const filteredAdvisorName = advisorFilter ? advisorNameById.get(advisorFilter) : null;

  return (
    <div>
      <Link href="/agency" className="text-xs text-slate mb-3 inline-block">
        ← 回到機構總覽
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">學生總覽</h1>
      {filteredAdvisorName ? (
        <p className="text-sm text-slate mb-6">
          僅顯示 <b className="text-ink">{filteredAdvisorName}</b> 的學生 ·{" "}
          <Link href="/agency/students" className="text-brand underline">
            查看全部學生
          </Link>
        </p>
      ) : (
        <p className="text-sm text-slate mb-6">機構所有學生，點選任一申請項目可查看詳細進度。</p>
      )}

      {error && (
        <div className="rounded border border-danger/30 bg-danger-tint text-danger text-sm px-4 py-3 mb-6">
          {ERROR_MESSAGES[error] || "發生錯誤，請稍後再試。"}
        </div>
      )}
      {success && (
        <div className="rounded border border-good/30 bg-good-tint text-good text-sm px-4 py-3 mb-6">
          新增成功！
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
        <Link
          href={`/agency/students?sort=name${sortLinkSuffix}`}
          className={`rounded px-3 py-1.5 text-xs font-semibold ${
            !sortByDeadline ? "bg-ink text-white" : "border border-line text-slate"
          }`}
        >
          依姓名排序
        </Link>
        <Link
          href={`/agency/students?sort=deadline${sortLinkSuffix}`}
          className={`rounded px-3 py-1.5 text-xs font-semibold ${
            sortByDeadline ? "bg-ink text-white" : "border border-line text-slate"
          }`}
        >
          依最近截止日排序
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {!students || students.length === 0 ? (
          <p className="text-sm text-slate">目前還沒有學生。</p>
        ) : (
          students.map((student: any) => {
            const addApplicationForThisStudent = createApplicationFor.bind(
              null,
              student.id,
              "/agency/students"
            );
            return (
            <div key={student.id} className="rounded border border-line bg-surface shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-display font-bold text-base">{student.display_name}</div>
                <div className="text-xs text-slate">
                  所屬顧問：{advisorNameById.get(student.primary_advisor_id) || "尚未指派"}
                </div>
              </div>
              {(!student.applications || student.applications.length === 0) && (
                <p className="text-sm text-slate">尚未新增任何申請項目。</p>
              )}
              <div className="flex flex-col gap-3 mb-3">
                {sortApplicationsByDeadline(student.applications || []).map((app: any) => (
                  <Link
                    key={app.id}
                    href={`/agency/applications/${app.id}`}
                    className="flex items-center gap-4 rounded border border-line p-3 hover:border-brand"
                  >
                    <div className="w-28 shrink-0 text-sm font-semibold">{app.schools?.name}</div>
                    <div className="flex-1">
                      <StageThread stage={app.stage as Stage} size="sm" />
                    </div>
                    <div className="w-24 shrink-0 text-right text-xs text-slate">
                      {app.deadline || "無截止日"}
                    </div>
                  </Link>
                ))}
              </div>
              <details>
                <summary className="cursor-pointer text-xs text-brand underline select-none">
                  + 新增學校
                </summary>
                <form
                  action={addApplicationForThisStudent}
                  className="mt-2 flex flex-wrap items-end gap-2"
                >
                  <input
                    name="school_name"
                    required
                    placeholder="學校名稱"
                    className="rounded border border-line px-3 py-1.5 text-sm outline-none focus:border-brand"
                  />
                  <input
                    name="deadline"
                    type="date"
                    className="rounded border border-line px-3 py-1.5 text-sm outline-none focus:border-brand"
                  />
                  <input
                    name="word_limit"
                    type="number"
                    placeholder="字數上限"
                    className="w-28 rounded border border-line px-3 py-1.5 text-sm outline-none focus:border-brand"
                  />
                  <button
                    type="submit"
                    className="rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    新增
                  </button>
                </form>
              </details>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
