"use server";

import { createClient } from "@/lib/supabase/server";

export interface CourseMatch {
  id: string;
  name_en: string;
  name_zh: string;
}

// Powers the "type in English or Chinese, get suggestions" autocomplete on
// the Grades page. Deliberately simple (ILIKE against both name columns,
// most-used first) rather than true fuzzy/pinyin matching — good enough
// for a starter catalog, worth revisiting if search quality becomes a
// complaint once the catalog has grown from real usage.
export async function searchCourseCatalog(query: string): Promise<CourseMatch[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_catalog")
    .select("id, name_en, name_zh")
    .or(`name_en.ilike.%${q}%,name_zh.ilike.%${q}%`)
    .order("usage_count", { ascending: false })
    .limit(8);

  if (error) {
    console.error("searchCourseCatalog failed:", error);
    return [];
  }
  return data || [];
}

// The "找不到就新增" fallback. Since we don't know which language the
// typed text is in, it's stored as both name_en and name_zh for now —
// fine for search/display purposes (it'll still match either language
// input), and easy to split into a proper translation pair later by
// editing the row directly in Supabase once the catalog is being
// actively curated.
export async function addCustomCourse(
  name: string
): Promise<{ success: true; course: CourseMatch } | { success: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "empty_name" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_signed_in" };

  const { data, error } = await supabase
    .from("course_catalog")
    .insert({ name_en: trimmed, name_zh: trimmed, created_by: user.id })
    .select("id, name_en, name_zh")
    .single();

  if (error) {
    // Unique violation (name_en, name_zh) — someone already added this
    // exact string. Not an error from the user's point of view: look it
    // up and hand back the existing row instead of failing.
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("course_catalog")
        .select("id, name_en, name_zh")
        .eq("name_en", trimmed)
        .eq("name_zh", trimmed)
        .maybeSingle();
      if (existing) return { success: true, course: existing };
    }
    console.error("addCustomCourse failed:", error);
    return { success: false, error: "add_failed" };
  }

  return { success: true, course: data };
}

export interface AcademicConfig {
  terms_per_year: number;
  grading_scale: "percentage" | "letter" | "gpa4";
}

export async function saveAcademicConfig(
  studentId: string,
  config: AcademicConfig
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_signed_in" };

  const { error } = await supabase.from("student_academic_config").upsert({
    student_id: studentId,
    terms_per_year: config.terms_per_year,
    grading_scale: config.grading_scale,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("saveAcademicConfig failed:", error);
    return { success: false, error: "save_failed" };
  }
  return { success: true };
}

export interface GradeRowInput {
  course_name: string;
  course_catalog_id: string | null;
  term_1_grade: string | null;
  term_2_grade: string | null;
  term_3_grade: string | null;
  term_4_grade: string | null;
}

export interface SavedGradeRow extends GradeRowInput {
  id: string;
}

// Full-replace on save rather than diffing individual row edits/deletes:
// simple, robust, and course lists per grade level are small (typically
// under 15 rows), so delete-then-reinsert is cheap and avoids a whole
// class of "did this row's id survive a previous save" bugs.
export async function saveGradesForLevel(
  studentId: string,
  gradeLevel: 11 | 12,
  rows: GradeRowInput[]
): Promise<{ success: true; rows: SavedGradeRow[] } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_signed_in" };

  const cleanRows = rows
    .map((r) => ({ ...r, course_name: r.course_name.trim() }))
    .filter((r) => r.course_name.length > 0);

  const { error: deleteError } = await supabase
    .from("student_grades")
    .delete()
    .eq("student_id", studentId)
    .eq("grade_level", gradeLevel);

  if (deleteError) {
    console.error("saveGradesForLevel: delete step failed:", deleteError);
    return { success: false, error: "save_failed" };
  }

  if (cleanRows.length === 0) {
    return { success: true, rows: [] };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("student_grades")
    .insert(
      cleanRows.map((r, i) => ({
        student_id: studentId,
        grade_level: gradeLevel,
        course_name: r.course_name,
        course_catalog_id: r.course_catalog_id,
        term_1_grade: r.term_1_grade,
        term_2_grade: r.term_2_grade,
        term_3_grade: r.term_3_grade,
        term_4_grade: r.term_4_grade,
        sort_order: i,
      }))
    )
    .select("id, course_name, course_catalog_id, term_1_grade, term_2_grade, term_3_grade, term_4_grade");

  if (insertError || !inserted) {
    console.error("saveGradesForLevel: insert step failed:", insertError);
    return { success: false, error: "save_failed" };
  }

  // Best-effort popularity tracking for the autocomplete's ordering —
  // never fail the save over this.
  try {
    const usedCatalogIds = cleanRows.map((r) => r.course_catalog_id).filter((id): id is string => !!id);
    for (const id of usedCatalogIds) {
      await supabase.rpc("increment_course_usage", { course_id: id }).then(
        () => {},
        () => {} // rpc may not exist yet in older DBs — ignore, non-critical
      );
    }
  } catch {
    // non-critical
  }

  return { success: true, rows: inserted };
}
