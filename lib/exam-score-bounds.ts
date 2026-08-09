// Real-world score bounds for the 測驗成績 (Testing) section, shared
// between app/actions/test-scores.ts (server) and TestScoreEditor.tsx
// (client) — same reasoning as lib/grade-scales.ts: a client component
// needs the same rules for immediate input-time rejection, and the
// server needs its own final check as a backstop regardless of what the
// client did. Batch 9.17, triggered by Dan finding these could all be
// typed in previously: IELTS General Training "12.5" (scale is 0–9),
// TOEFL iBT "1139999" (scale is 0–120), ACT "42" (scale is 1–36).
//
// Bounds below are the exams' actual official reporting scales,
// confirmed via web search at time of writing (College Board, IELTS,
// ETS/TOEFL, Duolingo, Pearson, Cambridge English, Paragon/CELPIP, OET
// — see Batch 9.17 write-up for sources). Where an exam reports in fixed
// increments (SAT/OET in 10s, Duolingo in 5s), that increment is
// enforced too, not just the min/max.

export interface ScoreBounds {
  min: number;
  max: number;
  // Score must be a multiple of this (after subtracting min isn't
  // required — all these scales start increments from a round number).
  // Omit for "any decimal is fine within range" (not used currently,
  // every known scale here has a fixed increment).
  step: number;
  // Human-readable hint shown next to the input. Left undefined for the
  // generic fallback bound so we don't assert false precision about a
  // scale we don't actually know.
  hint?: string;
}

// All current AP subjects share the same 1–5 scale (see AP_EXAM_OPTIONS
// in lib/exam-options.ts) — applied by category, not by individual exam
// name, since there'd otherwise be 43 identical entries below.
export const AP_SCORE_BOUNDS: ScoreBounds = { min: 1, max: 5, step: 1, hint: "1–5" };

export const EXAM_SCORE_BOUNDS: Record<string, ScoreBounds> = {
  "IELTS Academic": { min: 0, max: 9, step: 0.5, hint: "0–9（可含 0.5）" },
  "IELTS General Training": { min: 0, max: 9, step: 0.5, hint: "0–9（可含 0.5）" },
  "TOEFL iBT": { min: 0, max: 120, step: 1, hint: "0–120" },
  "Duolingo English Test": { min: 10, max: 160, step: 5, hint: "10–160（5 分為單位）" },
  "Pearson PTE Academic": { min: 10, max: 90, step: 1, hint: "10–90" },
  "Cambridge C1 Advanced (CAE)": { min: 80, max: 230, step: 1, hint: "80–230" },
  "Cambridge C2 Proficiency (CPE)": { min: 80, max: 230, step: 1, hint: "80–230" },
  "CELPIP": { min: 0, max: 12, step: 1, hint: "0–12" },
  "Occupational English Test (OET)": { min: 0, max: 500, step: 10, hint: "0–500（10 分為單位）" },
  "SAT": { min: 400, max: 1600, step: 10, hint: "400–1600" },
  "ACT": { min: 1, max: 36, step: 1, hint: "1–36" },
  "PSAT/NMSQT": { min: 320, max: 1520, step: 10, hint: "320–1520" },
};

// Used for the "其他考試" category (no preset list at all) and for any
// custom-typed exam name under "其他（自行輸入）" in the other three
// categories — we don't know the real scale, so this only blocks
// obviously-garbage entry (huge numbers, negatives) rather than
// asserting a specific range. Deliberately no `hint` — showing "0–9999"
// next to a custom exam name would look like a real, sourced scale when
// it isn't.
export const FALLBACK_SCORE_BOUNDS: ScoreBounds = { min: 0, max: 9999, step: 0.01 };

export function getScoreBounds(category: string, examName: string): ScoreBounds {
  if (category === "ap") return AP_SCORE_BOUNDS;
  return EXAM_SCORE_BOUNDS[examName] || FALLBACK_SCORE_BOUNDS;
}

function isMultipleOf(num: number, step: number): boolean {
  if (step === 0.01) return true; // fallback bound — no real increment to enforce
  const scaled = num / step;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

// Empty string / null always allowed — that's "not entered yet", not a
// real score. Final, authoritative check — used on blur and again
// server-side.
export function isValidTestScore(category: string, examName: string, raw: string | null | undefined): boolean {
  if (raw === null || raw === undefined || raw === "") return true;
  if (!/^\d+(\.\d+)?$/.test(raw)) return false; // reject anything that isn't a plain non-negative number
  const num = Number(raw);
  if (!Number.isFinite(num)) return false;
  const { min, max, step } = getScoreBounds(category, examName);
  if (num < min || num > max) return false;
  return isMultipleOf(num, step);
}
