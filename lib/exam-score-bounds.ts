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
// confirmed via web search at time of writing (College Board, IB, IELTS,
// ETS/TOEFL, Duolingo, Pearson, Cambridge English, Paragon/CELPIP, OET
// — see Batch 9.17/9.18 write-ups for sources). Where an exam reports in
// fixed increments (SAT/OET in 10s, Duolingo in 5s), that increment is
// enforced too, not just the min/max.
//
// Batch 9.18 (IB section): not every exam/component reports a plain
// number. IB's Extended Essay and Theory of Knowledge are graded A–E;
// CAS has no grade at all, just a completion record. Rather than force
// those into the numeric shape, a score can now be one of three kinds —
// see ScoreBounds below. This also fixes a gap from 9.17: the generic
// fallback (used for "其他" and any custom-typed exam name) was
// digit-only, which silently rejected entirely legitimate non-numeric
// scores for tests we don't have a specific scale for (a pass/fail
// result, a letter grade, "Level 5", etc.) — it's now "free" kind, only
// guarding against absurdly long junk rather than asserting a scale we
// don't actually know.

// Batch 9.19: CAS was originally "free" kind (any short text), which
// technically satisfied "not a hard numeric scale" but let anything —
// including garbage — through as a valid save. CAS only ever has three
// real states, so it gets its own "select" kind: an exact-match set of
// options, rendered as an actual dropdown in TestScoreEditor rather than
// a text field a person could type anything into.
export type ScoreKind = "numeric" | "letter" | "select" | "free";

export interface ScoreBounds {
  kind: ScoreKind;
  // numeric only
  min?: number;
  max?: number;
  step?: number;
  // letter only — score must case-insensitively match one of these
  letterOptions?: string[];
  // select only — score must exactly match one of these (rendered as
  // a <select>, so there's no case-normalization question the way
  // there is for typed letter grades)
  selectOptions?: string[];
  // Human-readable hint shown next to the input. Left undefined for the
  // generic "free" fallback so we don't assert false precision about a
  // scale we don't actually know.
  hint?: string;
}

function numeric(min: number, max: number, step: number, hint: string): ScoreBounds {
  return { kind: "numeric", min, max, step, hint };
}

function letter(options: string[], hint: string): ScoreBounds {
  return { kind: "letter", letterOptions: options, hint };
}

function select(options: string[]): ScoreBounds {
  return { kind: "select", selectOptions: options };
}

// All current AP subjects share the same 1–5 scale (see AP_EXAM_OPTIONS
// in lib/exam-options.ts) — applied by category, not by individual exam
// name, since there'd otherwise be 43 identical entries below.
export const AP_SCORE_BOUNDS: ScoreBounds = numeric(1, 5, 1, "1–5");

// All standard IB subjects (both HL and SL — the IB grades them on the
// same scale, just to a different depth) share the 1–7 scale. Applied by
// category as the default; the two lettered core components override it
// individually below.
export const IB_SUBJECT_SCORE_BOUNDS: ScoreBounds = numeric(1, 7, 1, "1–7");

const IB_LETTER_GRADE = letter(["A", "B", "C", "D", "E"], "A–E");
const CAS_STATUS = select(["尚未開始", "進行中", "已完成"]);

export const EXAM_SCORE_BOUNDS: Record<string, ScoreBounds> = {
  "IELTS Academic": numeric(0, 9, 0.5, "0–9（可含 0.5）"),
  "IELTS General Training": numeric(0, 9, 0.5, "0–9（可含 0.5）"),
  "TOEFL iBT": numeric(0, 120, 1, "0–120"),
  "Duolingo English Test": numeric(10, 160, 5, "10–160（5 分為單位）"),
  "Pearson PTE Academic": numeric(10, 90, 1, "10–90"),
  "Cambridge C1 Advanced (CAE)": numeric(80, 230, 1, "80–230"),
  "Cambridge C2 Proficiency (CPE)": numeric(80, 230, 1, "80–230"),
  "CELPIP": numeric(0, 12, 1, "0–12"),
  "Occupational English Test (OET)": numeric(0, 500, 10, "0–500（10 分為單位）"),
  "SAT": numeric(400, 1600, 10, "400–1600"),
  "ACT": numeric(1, 36, 1, "1–36"),
  "PSAT/NMSQT": numeric(320, 1520, 10, "320–1520"),
  // IB core requirements — override the category-wide 1–7 default above.
  "Extended Essay (EE)": IB_LETTER_GRADE,
  "Theory of Knowledge (TOK)": IB_LETTER_GRADE,
  "CAS（創意、活動、服務 / Creativity, Activity, Service）": CAS_STATUS,
};

// Used for the "其他考試" category (no preset list at all) and for any
// custom-typed exam name under "其他（自行輸入）" in the other
// categories — we don't know the real scale, so this doesn't assert one
// at all. Free text, only a sane length guard.
export const FALLBACK_SCORE_BOUNDS: ScoreBounds = { kind: "free" };

const MAX_FREE_TEXT_LENGTH = 40;

export function getScoreBounds(category: string, examName: string): ScoreBounds {
  if (EXAM_SCORE_BOUNDS[examName]) return EXAM_SCORE_BOUNDS[examName];
  if (category === "ap") return AP_SCORE_BOUNDS;
  if (category === "ib") return IB_SUBJECT_SCORE_BOUNDS;
  return FALLBACK_SCORE_BOUNDS;
}

function isMultipleOf(num: number, step: number): boolean {
  const scaled = num / step;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

// Empty string / null always allowed — that's "not entered yet", not a
// real score. Final, authoritative check — used on blur and again
// server-side.
export function isValidTestScore(category: string, examName: string, raw: string | null | undefined): boolean {
  if (raw === null || raw === undefined || raw === "") return true;
  const bounds = getScoreBounds(category, examName);

  if (bounds.kind === "free") {
    return raw.length <= MAX_FREE_TEXT_LENGTH;
  }

  if (bounds.kind === "letter") {
    return (bounds.letterOptions || []).includes(raw.toUpperCase());
  }

  if (bounds.kind === "select") {
    return (bounds.selectOptions || []).includes(raw);
  }

  // numeric
  if (!/^\d+(\.\d+)?$/.test(raw)) return false; // reject anything that isn't a plain non-negative number
  const num = Number(raw);
  if (!Number.isFinite(num)) return false;
  const { min = 0, max = Infinity, step = 1 } = bounds;
  if (num < min || num > max) return false;
  return isMultipleOf(num, step);
}
