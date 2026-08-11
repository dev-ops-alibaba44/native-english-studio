import { createClient } from "@/lib/supabase/server";
import { DeadlineCalendarView, type DeadlineItem } from "@/components/DeadlineCalendarView";

export default async function AdvisorCalendarPage() {
  const supabase = await createClient();

  // Same RLS-scoped query shape as /advisor/students (no explicit
  // agency_id filter needed — the "advisor manages agency-wide" RLS
  // policies on profiles/applications already restrict this to the
  // advisor's own agency).
  const { data: students } = await supabase
    .from("profiles")
    .select("id, display_name, applications(id, deadline, schools(name))")
    .eq("role", "student");

  const items: DeadlineItem[] = (students || []).flatMap((student: any) =>
    (student.applications || [])
      .filter((app: any) => app.deadline)
      .map((app: any) => ({
        id: app.id,
        href: `/advisor/applications/${app.id}`,
        deadline: app.deadline,
        title: app.schools?.name || "（未命名學校）",
        subtitle: student.display_name,
      }))
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">截止日曆</h1>
      <p className="text-sm text-slate mb-6">所有學生的申請截止日彙整在一起，方便安排每週工作。</p>
      <DeadlineCalendarView items={items} emptyText="目前還沒有任何學生設定截止日。" />
    </div>
  );
}
