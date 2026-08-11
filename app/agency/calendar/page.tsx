import { createClient } from "@/lib/supabase/server";
import { DeadlineCalendarView, type DeadlineItem } from "@/components/DeadlineCalendarView";

export default async function AgencyCalendarPage() {
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

  const { data: students } = await supabase
    .from("profiles")
    .select("id, display_name, applications(id, deadline, schools(name))")
    .eq("agency_id", profile.agency_id)
    .eq("role", "student");

  const items: DeadlineItem[] = (students || []).flatMap((student: any) =>
    (student.applications || [])
      .filter((app: any) => app.deadline)
      .map((app: any) => ({
        id: app.id,
        href: `/agency/applications/${app.id}`,
        deadline: app.deadline,
        title: app.schools?.name || "（未命名學校）",
        subtitle: student.display_name,
      }))
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">截止日曆</h1>
      <p className="text-sm text-slate mb-6">機構內所有學生的申請截止日彙整在一起，方便安排每週工作。</p>
      <DeadlineCalendarView items={items} emptyText="機構內目前還沒有任何學生設定截止日。" />
    </div>
  );
}
