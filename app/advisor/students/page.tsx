import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StageThread } from "@/components/StageThread";
import { type Stage } from "@/lib/stages";

export default async function AdvisorStudentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: students } = await supabase
    .from("profiles")
    .select("id, display_name, applications(id, stage, deadline, schools(name))")
    .eq("primary_advisor_id", user!.id);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">學生總覽</h1>
      <p className="text-sm text-slate mb-6">
        {students?.length || 0} 位學生 — 點選任一申請項目可查看草稿與留下回饋。
      </p>

      <div className="flex flex-col gap-4">
        {!students || students.length === 0 ? (
          <p className="text-sm text-slate">目前還沒有指派的學生。</p>
        ) : (
          students.map((student: any) => (
            <div key={student.id} className="rounded border border-line bg-surface shadow-card p-5">
              <div className="font-display font-bold text-base mb-3">{student.display_name}</div>
              {(!student.applications || student.applications.length === 0) && (
                <p className="text-sm text-slate">尚未新增任何申請項目。</p>
              )}
              <div className="flex flex-col gap-3">
                {student.applications?.map((app: any) => (
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
