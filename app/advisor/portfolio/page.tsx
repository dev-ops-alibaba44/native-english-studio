import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QueryPicker } from "@/components/QueryPicker";

const SECTIONS = [
  { slug: "grades", label: "成績", ready: true },
  { slug: "activities", label: "課外活動", ready: false },
  { slug: "sports", label: "運動", ready: false },
  { slug: "awards", label: "獎項與榮譽", ready: false },
  { slug: "service", label: "志工與工讀", ready: false },
];

export default async function AdvisorPortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student: studentId } = await searchParams;
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "student")
    .order("display_name");

  const selectedStudent = studentId ? (students || []).find((s) => s.id === studentId) || null : null;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">學習檔案</h1>
      <p className="text-sm text-slate mb-6">
        選一位學生，查看或協助填寫成績、活動等資料，讓 AI 之後能提供申請組合的評估建議。
      </p>

      <QueryPicker
        basePath="/advisor/portfolio"
        paramName="student"
        placeholder="選擇一位學生"
        activeId={studentId || null}
        options={(students || []).map((s) => ({ id: s.id, label: s.display_name }))}
      />

      {!selectedStudent ? (
        <p className="text-sm text-slate mt-4">請先選擇一位學生。</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          {SECTIONS.map((s) => (
            <Link
              key={s.slug}
              href={s.ready ? `/advisor/portfolio/${s.slug}?student=${selectedStudent.id}` : "#"}
              aria-disabled={!s.ready}
              className={`rounded-xl border border-line bg-surface p-4 shadow-card ${
                s.ready ? "hover:border-brand" : "opacity-60 cursor-not-allowed pointer-events-none"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm">{s.label}</h3>
                {!s.ready && <span className="text-xs text-warn">即將推出</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
