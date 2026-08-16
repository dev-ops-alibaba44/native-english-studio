"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidTestScore } from "@/lib/exam-score-bounds";
import { assertSeatActive, SeatInactiveError } from "@/lib/seats";

export type TestCategory = "ap" | "ib" | "language" | "admissions" | "other";

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

  try {
    await assertSeatActive(studentId);
  } catch (err) {
    if (err instanceof SeatInactiveError) return { success: false, error: err.code };
    throw err;
  }

  const cleanRows = rows
    .map((r) => ({ ...r, exam_name: r.exam_name.trim(), score: r.score.trim() }))
    .filter((r) => r.exam_name.length > 0);

  // Final backstop, same reasoning as grades.ts: the client already
  // blocks out-of-range values at the keystroke, but a request could in
  // principle bypass that, so this is the last line of defense before
  // anything hits the database. Rejects the whole save rather than
  // silently dropping/clearing the bad cell, so the student can see and
  // fix it instead of losing data they thought was saved.
  for (const row of cleanRows) {
    if (!isValidTestScore(category, row.exam_name, row.score)) {
      return { success: false, error: "invalid_score_value" };
    }
  }

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
