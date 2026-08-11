import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StageThread } from "@/components/StageThread";
import { type Stage } from "@/lib/stages";
import { createApplicationFor } from "@/app/actions/applications";
import { sortApplicationsByDeadline, sortStudentsByDeadline } from "@/lib/deadlines";

const ERROR_MESSAGES: Record<string, string> = {
  missing_school_name: "請輸入學校名稱。",
  no_agency: "此學生尚未加入任何機構。",
  school_failed: "無法建立學校資料，請稍後再試。",
  duplicate_school: "這位學生已經新增過這間學校的申請了。",
  application_failed: "無法建立申請項目，請稍後再試。",
};

export default async function AdvisorStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; sort?: string }>;
}) {
  const { error, success, sort } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: studentsRaw } = await supabase
    .from("profiles")
    .select(
      "id, display_name, primary_advisor_id, primary_advisor:profiles!primary_advisor_id(display_name), applications(id, stage, deadline, schools(name))"
    )
    .eq("role", "student")
    .order("display_name");

  const sortByDeadline = sort === "deadline";
  const students = sortByDeadline ? sortStudentsByDeadline(studentsRaw || []) : studentsRaw || [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">學生總覽</h1>
      <p className="text-sm text-slate mb-4">
        {students?.length || 0} 位學生（機構內所有學生）— 點選任一申請項目可查看草稿與留下回饋。
      </p>

      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/advisor/students"
          className={`rounded px-3 py-1.5 text-xs font-semibold ${
            !sortByDeadline ? "bg-ink text-white" : "border border-line text-slate"
          }`}
        >
          依姓名排序
        </Link>
        <Link
          href="/advisor/students?sort=deadline"
          className={`rounded px-3 py-1.5 text-xs font-semibold ${
            sortByDeadline ? "bg-ink text-white" : "border border-line text-slate"
          }`}
        >
          依最近截止日排序
        </Link>
      </div>

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

      <div className="flex flex-col gap-4">
        {!students || students.length === 0 ? (
          <p className="text-sm text-slate">機構內目前還沒有學生。</p>
        ) : (
          students.map((student: any) => {
            const addApplicationForThisStudent = createApplicationFor.bind(
              null,
              student.id,
              "/advisor/students"
            );
            return (
            <div key={student.id} className="rounded border border-line bg-surface shadow-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="font-display font-bold text-base">{student.display_name}</div>
                {student.primary_advisor_id === user!.id ? (
                  <span className="text-[11px] rounded-full bg-brand/10 text-brand px-2 py-0.5 font-semibold">
                    ⭐ 你是主要顧問
                  </span>
                ) : (
                  <span className="text-[11px] rounded-full bg-line/40 text-slate px-2 py-0.5">
                    主要顧問：{student.primary_advisor?.display_name || "尚未指派"}
                  </span>
                )}
              </div>
              {(!student.applications || student.applications.length === 0) && (
                <p className="text-sm text-slate">尚未新增任何申請項目。</p>
              )}
              <div className="flex flex-col gap-3 mb-3">
                {sortApplicationsByDeadline(student.applications || []).map((app: any) => (
                  <Link
                    key={app.id}
                    href={`/advisor/applications/${app.id}`}
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
