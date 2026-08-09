"use server";

import { createClient } from "@/lib/supabase/server";

export type TestCategory = "ap" | "language" | "admissions" | "other";

export interface TestScoreRowInput {
  exam_name: string;
  test_month: number | null;
  test_year: number | null;
  score: string;
}

export interface SavedTestScoreRow extends TestScoreRowInput {
  id: string;
}

// Full-replace on save per category — same pattern as grades/activities.
// Retakes are expected (a student might sit TOEFL three times), so this
// never dedupes by exam name; every row saved is kept as its own entry.
export async function saveTestScoresForCategory(
  studentId: string,
  category: TestCategory,
  rows: TestScoreRowInput[]
): Promise<{ success: true; rows: SavedTestScoreRow[] } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_signed_in" };

  const cleanRows = rows
    .map((r) => ({ ...r, exam_name: r.exam_name.trim(), score: r.score.trim() }))
    .filter((r) => r.exam_name.length > 0);

  const { error: deleteError } = await supabase
    .from("student_test_scores")
    .delete()
    .eq("student_id", studentId)
    .eq("category", category);

  if (deleteError) {
    console.error("saveTestScoresForCategory: delete step failed:", deleteError);
    return { success: false, error: "save_failed" };
  }

  if (cleanRows.length === 0) {
    return { success: true, rows: [] };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("student_test_scores")
    .insert(
      cleanRows.map((r, i) => ({
        student_id: studentId,
        category,
        exam_name: r.exam_name,
        test_month: r.test_month,
        test_year: r.test_year,
        score: r.score,
        sort_order: i,
      }))
    )
    .select("id, exam_name, test_month, test_year, score");

  if (insertError || !inserted) {
    console.error("saveTestScoresForCategory: insert step failed:", insertError);
    return { success: false, error: "save_failed" };
  }

  return { success: true, rows: inserted };
}
