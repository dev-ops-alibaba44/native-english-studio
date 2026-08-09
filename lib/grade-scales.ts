// Shared between app/actions/grades.ts (server) and components/GradesEditor.tsx
// (client) — kept here rather than duplicated, and rather than living only
// in the "use server" file, since a client component needs the same rules
// for immediate input-time validation (Batch 9.12, item 4: raw garbage
// like "34555" or "1102023" was previously accepted because a number
// input's max attribute doesn't actually stop out-of-range values from
// being typed or displayed).

export type GradingScale = "percentage" | "letter" | "gpa4";

export const GRADING_SCALE_LABELS: Record<GradingScale, string> = {
  percentage: "百分制（0–100）",
  letter: "字母等第（A–F）",
  gpa4: "GPA（0–4.0）",
};

export const LETTER_OPTIONS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"];

// Empty string / null always allowed — that's just "not entered yet",
// not a real grade value.
export function isValidGradeValue(scale: string, raw: string | null | undefined): boolean {
  if (raw === null || raw === undefined || raw === "") return true;
  if (scale === "letter") return LETTER_OPTIONS.includes(raw);
  if (scale === "percentage" || scale === "gpa4") {
    if (!/^\d+(\.\d+)?$/.test(raw)) return false; // reject anything that isn't a plain non-negative number
    const num = Number(raw);
    if (!Number.isFinite(num)) return false;
    return scale === "percentage" ? num >= 0 && num <= 100 : num >= 0 && num <= 4;
  }
  // Unknown scale key (shouldn't happen, but don't silently accept
  // garbage under a scale we don't recognize either).
  return false;
}
