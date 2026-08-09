import { createClient } from "@/lib/supabase/server";
import { TestScoreEditor } from "@/components/TestScoreEditor";
import type { TestCategory, SavedTestScoreRow } from "@/app/actions/test-scores";
import { AP_EXAM_OPTIONS, LANGUAGE_EXAM_OPTIONS, ADMISSIONS_EXAM_OPTIONS } from "@/lib/exam-options";

export async function TestingSection({ studentId, studentName }: { studentId: string; studentName?: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_test_scores")
    .select("id, category, exam_name, test_month, test_year, score")
    .eq("student_id", studentId)
    .order("sort_order");

  const byCategory: Record<TestCategory, SavedTestScoreRow[]> = { ap: [], language: [], admissions: [], other: [] };
  for (const row of (data || []) as any[]) {
    byCategory[row.category as TestCategory].push(row);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">
        測驗成績
        {studentName && <span className="text-base font-normal text-slate"> — {studentName}</span>}
      </h1>
      <p className="text-sm text-slate mb-6">
        以下四類考試分開填寫，讓資料一目瞭然。同一項考試若重考過，可以新增多筆紀錄，不會互相覆蓋。
      </p>

      <div className="flex flex-col gap-6">
        <TestScoreEditor
          studentId={studentId}
          category="ap"
          initialRows={byCategory.ap}
          heading="🎓 AP 考試"
          intro="校外自行報考的 AP 考試（非學校課程成績，那些請到「成績」頁面填寫）。"
          presetOptions={AP_EXAM_OPTIONS}
          examLabel="科目"
        />
        <TestScoreEditor
          studentId={studentId}
          category="language"
          initialRows={byCategory.language}
          heading="🗣️ 語言測驗"
          intro="IELTS、TOEFL 等英語能力測驗。"
          presetOptions={LANGUAGE_EXAM_OPTIONS}
          examLabel="測驗名稱"
        />
        <TestScoreEditor
          studentId={studentId}
          category="admissions"
          initialRows={byCategory.admissions}
          heading="📝 大學入學測驗"
          intro="SAT、ACT 等大學申請適用的入學測驗。"
          presetOptions={ADMISSIONS_EXAM_OPTIONS}
          examLabel="測驗名稱"
        />
        <TestScoreEditor
          studentId={studentId}
          category="other"
          initialRows={byCategory.other}
          heading="📋 其他考試"
          intro="任何不屬於以上三類，但想讓顧問或機構知道的考試成績。"
          presetOptions={[]}
          examLabel="考試名稱"
        />
      </div>
    </div>
  );
}
