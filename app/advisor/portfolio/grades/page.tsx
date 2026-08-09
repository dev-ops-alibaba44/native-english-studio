import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GradesEditor } from "@/components/GradesEditor";
import type { AcademicConfig, SavedGradeRow } from "@/app/actions/grades";

export default async function AdvisorGradesPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student: studentId } = await searchParams;
  const supabase = await createClient();

  if (!studentId) {
    return (
      <div>
        <Link href="/advisor/portfolio" className="text-xs text-slate mb-3 inline-block">
          ← 回到學習檔案
        </Link>
        <p className="text-sm text-slate">請先從學習檔案頁面選擇一位學生。</p>
      </div>
    );
  }

  const { data: student } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", studentId)
    .single();

  const [{ data: configRow }, { data: grades }] = await Promise.all([
    supabase
      .from("student_academic_config")
      .select("terms_per_year, grading_scale, school_id, school:taiwan_high_schools(name_zh)")
      .eq("student_id", studentId)
      .maybeSingle(),
    supabase
      .from("student_grades")
      .select("id, grade_level, course_name, course_catalog_id, term_1_grades, term_2_grades, term_3_grades, term_4_grades")
      .eq("student_id", studentId)
      .order("sort_order"),
  ]);

  const config: AcademicConfig = configRow
    ? {
        terms_per_year: configRow.terms_per_year,
        grading_scale: configRow.grading_scale,
        school_id: configRow.school_id,
      }
    : { terms_per_year: 2, grading_scale: "percentage", school_id: null };
  const schoolName = (configRow as any)?.school?.name_zh || "";

  const allGrades = (grades || []) as unknown as SavedGradeRow[];
  const grades11 = allGrades.filter((g: any) => g.grade_level === 11);
  const grades12 = allGrades.filter((g: any) => g.grade_level === 12);

  return (
    <div>
      <Link href="/advisor/portfolio" className="text-xs text-slate mb-3 inline-block">
        ← 回到學習檔案
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">
        成績 <span className="text-base font-normal text-slate">— {student?.display_name}</span>
      </h1>
      <p className="text-sm text-slate mb-6">
        填寫高二、高三各科成績。先設定學校的學制與成績表示方式，下方表格會自動配合調整。
      </p>

      <GradesEditor
        studentId={studentId}
        initialConfig={config}
        initialSchoolName={schoolName}
        initialGrades11={grades11}
        initialGrades12={grades12}
      />
    </div>
  );
}
