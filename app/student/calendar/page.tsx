import { createClient } from "@/lib/supabase/server";
import { DeadlineCalendarView, type DeadlineItem } from "@/components/DeadlineCalendarView";

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

  const items: DeadlineItem[] = (applications || []).map((app: any) => ({
    id: app.id,
    href: `/student/applications/${app.id}`,
    deadline: app.deadline,
    title: app.schools?.name || "（未命名學校）",
  }));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">截止日曆</h1>
      <p className="text-sm text-slate mb-6">依日期排序的所有截止日，也可以切換成月曆檢視。</p>
      <DeadlineCalendarView items={items} emptyText="目前還沒有設定截止日的申請項目。" />
    </div>
  );
}
