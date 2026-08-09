import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GradesEditor } from "@/components/GradesEditor";
import type { AcademicConfig, SavedGradeRow } from "@/app/actions/grades";

export default async function StudentGradesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: configRow }, { data: grades }] = await Promise.all([
    supabase
      .from("student_academic_config")
      .select("terms_per_year, grading_scale")
      .eq("student_id", user!.id)
      .maybeSingle(),
    supabase
      .from("student_grades")
      .select("id, grade_level, course_name, course_catalog_id, term_1_grade, term_2_grade, term_3_grade, term_4_grade")
      .eq("student_id", user!.id)
      .order("sort_order"),
  ]);

  const config: AcademicConfig = configRow || { terms_per_year: 2, grading_scale: "percentage" };
  const allGrades = (grades || []) as SavedGradeRow[];
  const grades11 = allGrades.filter((g: any) => g.grade_level === 11);
  const grades12 = allGrades.filter((g: any) => g.grade_level === 12);

  return (
    <div>
      <Link href="/student/portfolio" className="text-xs text-slate mb-3 inline-block">
        ← 回到學習檔案
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">成績</h1>
      <p className="text-sm text-slate mb-6">
        填寫高二、高三各科成績。先設定學校的學制與成績表示方式，下方表格會自動配合調整。
      </p>

      <GradesEditor
        studentId={user!.id}
        initialConfig={config}
        initialGrades11={grades11}
        initialGrades12={grades12}
      />
    </div>
  );
}
