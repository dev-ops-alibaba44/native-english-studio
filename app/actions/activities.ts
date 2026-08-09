"use server";

import { createClient } from "@/lib/supabase/server";

export type ActivityCategory = "extracurricular" | "sport" | "award" | "service";

export interface ActivityRowInput {
  title: string;
  organization: string;
  start_month: number | null;
  start_year: number | null;
  end_month: number | null;
  end_year: number | null;
  hours_per_week: string; // kept as string through the form layer, parsed on save
  description: string;
}

export interface SavedActivityRow extends ActivityRowInput {
  id: string;
}

const MAX_WORDS = 50;

function wordCount(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

// Full-replace on save per category, same pattern as saveGradesForLevel —
// simple, robust, and row counts per category are always small.
export async function saveActivitiesForCategory(
  studentId: string,
  category: ActivityCategory,
  rows: ActivityRowInput[]
): Promise<{ success: true; rows: SavedActivityRow[] } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_signed_in" };

  const cleanRows = rows
    .map((r) => ({ ...r, title: r.title.trim(), description: r.description.trim() }))
    .filter((r) => r.title.length > 0);

  // Server-side backstop, same reasoning as the grades validation: the
  // textarea already stops the count going over 50 as you type, but this
  // is the last line of defense against a bad row actually landing in the
  // database.
  for (const row of cleanRows) {
    if (wordCount(row.description) > MAX_WORDS) {
      return { success: false, error: "description_too_long" };
    }
    const hours = row.hours_per_week === "" ? null : Number(row.hours_per_week);
    if (hours !== null && (!Number.isFinite(hours) || hours < 0 || hours > 168)) {
      return { success: false, error: "invalid_hours" };
    }
  }

  const { error: deleteError } = await supabase
    .from("student_activities")
    .delete()
    .eq("student_id", studentId)
    .eq("category", category);

  if (deleteError) {
    console.error("saveActivitiesForCategory: delete step failed:", deleteError);
    return { success: false, error: "save_failed" };
  }

  if (cleanRows.length === 0) {
    return { success: true, rows: [] };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("student_activities")
    .insert(
      cleanRows.map((r, i) => ({
        student_id: studentId,
        category,
        title: r.title,
        organization: r.organization.trim(),
        start_month: r.start_month,
        start_year: r.start_year,
        end_month: category === "award" ? null : r.end_month,
        end_year: category === "award" ? null : r.end_year,
        hours_per_week: category === "award" ? null : r.hours_per_week === "" ? null : Number(r.hours_per_week),
        description: r.description,
        sort_order: i,
      }))
    )
    .select("id, title, organization, start_month, start_year, end_month, end_year, hours_per_week, description");

  if (insertError || !inserted) {
    console.error("saveActivitiesForCategory: insert step failed:", insertError);
    return { success: false, error: "save_failed" };
  }

  return {
    success: true,
    rows: inserted.map((r) => ({ ...r, hours_per_week: r.hours_per_week === null ? "" : String(r.hours_per_week) })),
  };
}
