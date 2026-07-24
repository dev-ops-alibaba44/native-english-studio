import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABELS, type Stage } from "@/lib/stages";

type Urgency = "overdue" | "urgent" | "ok";

function daysRemaining(deadline: string): number {
  const ms = new Date(deadline + "T00:00:00").getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

function urgencyOf(deadline: string | null, stage: string): Urgency {
  if (stage === "final") return "ok";
  if (!deadline) return "ok";
  const remaining = daysRemaining(deadline);
  if (remaining < 0) return "overdue";
  if (remaining <= 7) return "urgent";
  return "ok";
}

export default async function AdvisorTodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: students } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("primary_advisor_id", user!.id);

  const studentIds = (students || []).map((s) => s.id);
  const studentNameById = new Map((students || []).map((s) => [s.id, s.display_name]));

  const { data: applications } = studentIds.length
    ? await supabase
        .from("applications")
        .select("id, deadline, stage, student_id, schools(name)")
        .in("student_id", studentIds)
    : { data: [] as any[] };

  const rows = (applications || [])
    .map((app: any) => ({
      ...app,
      urgency: urgencyOf(app.deadline, app.stage),
      studentName: studentNameById.get(app.student_id) || "（未命名學生）",
    }))
    .sort((a, b) => {
      const order: Record<Urgency, number> = { overdue: 0, urgent: 1, ok: 2 };
      if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency];
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });

  const urgentCount = rows.filter((r) => r.urgency !== "ok").length;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">本週關注</h1>
      <p className="text-sm text-slate mb-6">
        依緊急程度排序 — 一登入就知道今天該看誰。
        {urgentCount > 0 && ` 目前有 ${urgentCount} 項需要留意。`}
      </p>

      <div className="rounded border border-line bg-surface shadow-card divide-y divide-line">
        {rows.length === 0 ? (
          <p className="p-5 text-sm text-slate">
            目前還沒有指派的學生，或學生尚未新增任何申請項目。
          </p>
        ) : (
          rows.map((app: any) => {
            const remaining = app.deadline ? daysRemaining(app.deadline) : null;
            const barColor =
              app.urgency === "overdue"
                ? "bg-danger"
                : app.urgency === "urgent"
                ? "bg-warn"
                : "bg-good";
            const pillCls =
              app.urgency === "overdue"
                ? "bg-danger-tint text-danger"
                : app.urgency === "urgent"
                ? "bg-warn-tint text-warn"
                : "bg-good-tint text-good";
            const pillLabel =
              app.urgency === "overdue"
                ? `已逾期 ${Math.abs(remaining!)} 天`
                : app.urgency === "urgent"
                ? `剩 ${remaining} 天`
                : "進度良好";

            return (
              <Link
                key={app.id}
                href={`/advisor/applications/${app.id}`}
                className="flex items-center gap-4 p-4 hover:bg-paper"
              >
                <div className={`w-1 self-stretch rounded ${barColor}`} />
                <div className="flex-1">
                  <div className="font-bold text-sm">
                    {app.studentName}
                    <span className="ml-2 text-xs font-normal text-slate">
                      {app.schools?.name} · {STAGE_LABELS[app.stage as Stage]}
                    </span>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pillCls}`}>
                  {pillLabel}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
