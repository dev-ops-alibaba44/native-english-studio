import { createClient } from "@/lib/supabase/server";
import { ActivityEditor } from "@/components/ActivityEditor";
import type { ActivityCategory, SavedActivityRow } from "@/app/actions/activities";

const CATEGORY_CONFIG: Record<
  ActivityCategory,
  {
    heading: string;
    intro: string;
    titleLabel: string;
    orgLabel: string;
    showHours: boolean;
    showEndDate: boolean;
    singleDateLabel: string;
  }
> = {
  extracurricular: {
    heading: "課外活動",
    intro: "社團、學術活動、營隊等。填寫時間範圍與每週投入時數，讓 AI 之後能看出投入程度。",
    titleLabel: "活動名稱",
    orgLabel: "社團／組織",
    showHours: true,
    showEndDate: true,
    singleDateLabel: "日期",
  },
  sport: {
    heading: "運動",
    intro: "校隊、個人運動項目等。",
    titleLabel: "運動項目",
    orgLabel: "校隊／團隊",
    showHours: true,
    showEndDate: true,
    singleDateLabel: "日期",
  },
  award: {
    heading: "獎項與榮譽",
    intro: "競賽、獎學金、榮譽等。每項只需填寫獲獎的單一日期。",
    titleLabel: "獎項名稱",
    orgLabel: "頒發單位",
    showHours: false,
    showEndDate: false,
    singleDateLabel: "獲獎日期",
  },
  service: {
    heading: "志工與工讀",
    intro: "志工服務、打工經驗等。",
    titleLabel: "服務／工作名稱",
    orgLabel: "機構／雇主",
    showHours: true,
    showEndDate: true,
    singleDateLabel: "日期",
  },
};

export async function ActivitySection({
  studentId,
  category,
  studentName,
}: {
  studentId: string;
  category: ActivityCategory;
  studentName?: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_activities")
    .select("id, title, organization, start_month, start_year, end_month, end_year, hours_per_week, description")
    .eq("student_id", studentId)
    .eq("category", category)
    .order("sort_order");

  const rows: SavedActivityRow[] = (data || []).map((r: any) => ({
    ...r,
    hours_per_week: r.hours_per_week === null ? "" : String(r.hours_per_week),
  }));

  const config = CATEGORY_CONFIG[category];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">
        {config.heading}
        {studentName && <span className="text-base font-normal text-slate"> — {studentName}</span>}
      </h1>
      <p className="text-sm text-slate mb-6">{config.intro}</p>

      <ActivityEditor
        studentId={studentId}
        category={category}
        initialRows={rows}
        titleLabel={config.titleLabel}
        orgLabel={config.orgLabel}
        showHours={config.showHours}
        showEndDate={config.showEndDate}
        singleDateLabel={config.singleDateLabel}
      />
    </div>
  );
}
