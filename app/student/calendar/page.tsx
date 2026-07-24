import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function daysRemaining(deadline: string): number {
  const ms = new Date(deadline + "T00:00:00").getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: applications } = await supabase
    .from("applications")
    .select("id, deadline, schools(name)")
    .eq("student_id", user!.id)
    .not("deadline", "is", null)
    .order("deadline", { ascending: true });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">截止日曆</h1>
      <p className="text-sm text-slate mb-6">依日期排序的所有截止日。</p>

      <div className="rounded border border-line bg-surface shadow-card divide-y divide-line">
        {!applications || applications.length === 0 ? (
          <p className="p-5 text-sm text-slate">目前還沒有設定截止日的申請項目。</p>
        ) : (
          applications.map((app: any) => {
            const remaining = daysRemaining(app.deadline);
            const urgent = remaining <= 7;
            const overdue = remaining < 0;
            return (
              <Link
                key={app.id}
                href={`/student/applications/${app.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-paper"
              >
                <div className="w-16 text-center shrink-0">
                  <div className="font-display text-lg font-bold">
                    {new Date(app.deadline + "T00:00:00").getDate()}
                  </div>
                  <div className="text-[10px] text-slate uppercase font-util">
                    {new Date(app.deadline + "T00:00:00").toLocaleString("en-US", { month: "short" })}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{app.schools?.name}</div>
                  <div className="text-xs text-slate">{app.deadline}</div>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    overdue
                      ? "bg-danger-tint text-danger"
                      : urgent
                      ? "bg-warn-tint text-warn"
                      : "bg-slate-light text-slate"
                  }`}
                >
                  {overdue ? `已逾期 ${Math.abs(remaining)} 天` : `剩 ${remaining} 天`}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
