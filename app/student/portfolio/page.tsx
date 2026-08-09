import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const SECTIONS = [
  { href: "/student/portfolio/grades", label: "成績", desc: "高二、高三各科成績", ready: true },
  { href: "/student/portfolio/activities", label: "課外活動", desc: "社團、學術活動等", ready: true },
  { href: "/student/portfolio/sports", label: "運動", desc: "校隊、個人運動項目", ready: true },
  { href: "/student/portfolio/awards", label: "獎項與榮譽", desc: "競賽、獎學金等", ready: true },
  { href: "/student/portfolio/service", label: "志工與工讀", desc: "志工服務、打工經驗", ready: true },
];

export default async function StudentPortfolioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: gradesCount } = await supabase
    .from("student_grades")
    .select("id", { count: "exact", head: true })
    .eq("student_id", user!.id);

  const { data: activityRows } = await supabase
    .from("student_activities")
    .select("category")
    .eq("student_id", user!.id);
  const activityCounts: Record<string, number> = {};
  for (const row of activityRows || []) {
    activityCounts[row.category] = (activityCounts[row.category] || 0) + 1;
  }
  const COUNT_BY_HREF: Record<string, number> = {
    "/student/portfolio/grades": gradesCount ?? 0,
    "/student/portfolio/activities": activityCounts["extracurricular"] || 0,
    "/student/portfolio/sports": activityCounts["sport"] || 0,
    "/student/portfolio/awards": activityCounts["award"] || 0,
    "/student/portfolio/service": activityCounts["service"] || 0,
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">學習檔案</h1>
      <p className="text-sm text-slate mb-6">
        填寫完成績、活動、獎項等資料後，AI 可以協助評估你的申請組合、建議適合的學校，並給出改善方向。
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-line bg-surface p-4 shadow-card hover:border-brand"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display font-bold text-sm">{s.label}</h3>
              <span className="text-xs text-slate">{COUNT_BY_HREF[s.href] ?? 0} 筆已填寫</span>
            </div>
            <p className="text-xs text-slate">{s.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-brand/20 bg-brand-tint p-5">
        <h2 className="font-display font-bold text-base mb-2">🤖 AI 綜合評估</h2>
        <p className="text-sm text-ink mb-1">
          完成上方所有項目後，AI 會綜合你的成績、活動與正在準備的文書，提供加強建議、適合的學校方向，以及每所學校的
          機會等級（衝刺 / 目標 / 保底）。
        </p>
        <p className="text-xs text-slate">此功能將於下一批次推出 — 上方五個子頁面現在都可以開始填寫了。</p>
      </div>
    </div>
  );
}
