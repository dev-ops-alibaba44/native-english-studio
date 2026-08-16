"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidGradeValue } from "@/lib/grade-scales";
import { assertSeatActive, SeatInactiveError } from "@/lib/seats";

export interface CourseMatch {
  id: string;
  name_en: string;
  name_zh: string;
}

// Powers the "type in English or Chinese, get suggestions" autocomplete on
// the Grades page. If the student has a school on file, results already
// used at that school are surfaced first (see school_courses, populated by
// saveGradesForLevel below) — a new student at a school where others have
// already entered their courses should see those names first. Falls back
// to a plain catalog-wide search otherwise. Still simple ILIKE matching,
// not true fuzzy/pinyin search — worth revisiting once the catalog has
// grown from real usage.
export async function searchCourseCatalog(query: string, schoolId?: string | null): Promise<CourseMatch[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const supabase = await createClient();
  const filter = `name_en.ilike.%${q}%,name_zh.ilike.%${q}%`;

  if (schoolId) {
    const { data: schoolMatches } = await supabase
      .from("school_courses")
      .select("usage_count, course:course_catalog!inner(id, name_en, name_zh)")
      .eq("school_id", schoolId)
      .or(filter, { referencedTable: "course_catalog" })
      .order("usage_count", { ascending: false })
      .limit(5);

    const schoolResults: CourseMatch[] = (schoolMatches || []).map((m: any) => m.course);
    if (schoolResults.length >= 8) return schoolResults.slice(0, 8);

    const { data: rest } = await supabase
      .from("course_catalog")
      .select("id, name_en, name_zh")
      .or(filter)
      .order("usage_count", { ascending: false })
      .limit(8);

    const seen = new Set(schoolResults.map((r) => r.id));
    const merged = [...schoolResults, ...(rest || []).filter((r) => !seen.has(r.id))];
    return merged.slice(0, 8);
  }

  const { data, error } = await supabase
    .from("course_catalog")
    .select("id, name_en, name_zh")
    .or(filter)
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

export interface SchoolMatch {
  id: string;
  name_zh: string;
  name_en: string | null;
}

export async function searchSchoolCatalog(query: string): Promise<SchoolMatch[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("taiwan_high_schools")
    .select("id, name_zh, name_en")
    .or(`name_zh.ilike.%${q}%,name_en.ilike.%${q}%`)
    .limit(8);
  if (error) {
    console.error("searchSchoolCatalog failed:", error);
    return [];
  }
  return data || [];
}

export async function addCustomSchool(
  name: string
): Promise<{ success: true; school: SchoolMatch } | { success: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "empty_name" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_signed_in" };

  const { data, error } = await supabase
    .from("taiwan_high_schools")
    .insert({ name_zh: trimmed, name_en: trimmed, created_by: user.id })
    .select("id, name_zh, name_en")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("taiwan_high_schools")
        .select("id, name_zh, name_en")
        .eq("name_zh", trimmed)
        .maybeSingle();
      if (existing) return { success: true, school: existing };
    }
    console.error("addCustomSchool failed:", error);
    return { success: false, error: "add_failed" };
  }
  return { success: true, school: data };
}

export interface AcademicConfig {
  terms_per_year: number;
  grading_scale: "percentage" | "letter" | "gpa4";
  school_id: string | null;
}

export async function saveAcademicConfig(
  studentId: string,
  config: { terms_per_year: number; grading_scale: string; school_id: string | null }
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_signed_in" };

  try {
    await assertSeatActive(studentId);
  } catch (err) {
    if (err instanceof SeatInactiveError) return { success: false, error: err.code };
    throw err;
  }

  const { error } = await supabase.from("student_academic_config").upsert({
    student_id: studentId,
    terms_per_year: config.terms_per_year,
    grading_scale: config.grading_scale,
    school_id: config.school_id,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("saveAcademicConfig failed:", error);
    return { success: false, error: "save_failed" };
  }
  return { success: true };
}

// Each term now holds a small dict keyed by grading scale
// ({"percentage": "88", "gpa4": "3.7"}), not a single value — see Batch
// 9.12's migration notes for why. A row's UI only ever shows/edits the
// key matching the student's CURRENT grading_scale, but every key is
// preserved through this type and round-tripped on save, so switching
// scales back and forth never destroys a previously-entered value under
// a different scale.
export interface GradeRowInput {
  course_name: string;
  course_catalog_id: string | null;
  term_1_grades: Record<string, string>;
  term_2_grades: Record<string, string>;
  term_3_grades: Record<string, string>;
  term_4_grades: Record<string, string>;
}

export interface SavedGradeRow extends GradeRowInput {
  id: string;
}

const TERM_KEYS = ["term_1_grades", "term_2_grades", "term_3_grades", "term_4_grades"] as const;

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

  try {
    await assertSeatActive(studentId);
  } catch (err) {
    if (err instanceof SeatInactiveError) return { success: false, error: err.code };
    throw err;
  }

  const cleanRows = rows
    .map((r) => ({ ...r, course_name: r.course_name.trim() }))
    .filter((r) => r.course_name.length > 0);

  // Server-side backstop (Batch 9.12, item 4): every value in every
  // term's scale-dict must be valid for the scale it's keyed under.
  // Normal use should never hit this — the input widgets already prevent
  // out-of-range typing — but this is the last line of defense against
  // garbage actually landing in the database, so a failure here rejects
  // the whole save rather than silently dropping the bad cell.
  for (const row of cleanRows) {
    for (const termKey of TERM_KEYS) {
      const grades = row[termKey] || {};
      for (const [scale, value] of Object.entries(grades)) {
        if (!isValidGradeValue(scale, value)) {
          return { success: false, error: "invalid_grade_value" };
        }
      }
    }
  }

  const { data: config } = await supabase
    .from("student_academic_config")
    .select("school_id")
    .eq("student_id", studentId)
    .maybeSingle();

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
        term_1_grades: r.term_1_grades || {},
        term_2_grades: r.term_2_grades || {},
        term_3_grades: r.term_3_grades || {},
        term_4_grades: r.term_4_grades || {},
        sort_order: i,
      }))
    )
    .select("id, course_name, course_catalog_id, term_1_grades, term_2_grades, term_3_grades, term_4_grades");

  if (insertError || !inserted) {
    console.error("saveGradesForLevel: insert step failed:", insertError);
    return { success: false, error: "save_failed" };
  }

  // Best-effort popularity tracking (global + per-school) for the
  // autocomplete's ordering — never fail the save over this.
  try {
    const usedCatalogIds = [...new Set(cleanRows.map((r) => r.course_catalog_id).filter((id): id is string => !!id))];
    for (const id of usedCatalogIds) {
      await supabase.rpc("increment_course_usage", { course_id: id }).then(
        () => {},
        () => {}
      );
      if (config?.school_id) {
        await supabase
          .rpc("record_school_course_usage", { p_school_id: config.school_id, p_course_id: id })
          .then(
            () => {},
            () => {}
          );
      }
    }
  } catch {
    // non-critical
  }

  return { success: true, rows: inserted };
}
