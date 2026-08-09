// Preset options for the 測驗成績 (Testing) section's three structured
// subsections. "其他" (Other) is always appended so nothing is ever a
// dead end — picking it switches that row to free-text entry client-side.
// The 4th subsection (其他考試) has no preset list at all, just free text.

// Official AP course titles, from https://apcentral.collegeboard.org/courses
// (43 subjects as of this writing — College Board adds/retires titles
// occasionally, so "其他" covers anything not yet on this list).
export const AP_EXAM_OPTIONS = [
  "AP 2-D Art and Design",
  "AP 3-D Art and Design",
  "AP Drawing",
  "AP Art History",
  "AP Music Theory",
  "AP English Language and Composition",
  "AP English Literature and Composition",
  "AP African American Studies",
  "AP Comparative Government and Politics",
  "AP European History",
  "AP Human Geography",
  "AP Macroeconomics",
  "AP Microeconomics",
  "AP Psychology",
  "AP United States Government and Politics",
  "AP United States History",
  "AP World History: Modern",
  "AP Calculus AB",
  "AP Calculus BC",
  "AP Computer Science A",
  "AP Computer Science Principles",
  "AP Precalculus",
  "AP Statistics",
  "AP Biology",
  "AP Chemistry",
  "AP Environmental Science",
  "AP Physics 1: Algebra-Based",
  "AP Physics 2: Algebra-Based",
  "AP Physics C: Electricity and Magnetism",
  "AP Physics C: Mechanics",
  "AP Chinese Language and Culture",
  "AP French Language and Culture",
  "AP German Language and Culture",
  "AP Italian Language and Culture",
  "AP Japanese Language and Culture",
  "AP Latin",
  "AP Spanish Language and Culture",
  "AP Spanish Literature and Culture",
  "AP Research",
  "AP Seminar",
  "AP Business with Personal Finance",
  "AP Cybersecurity",
  "AP Networking",
];

// Common IELTS alternatives / English proficiency tests used in college
// applications, per ieltsbuddy.com's list plus IELTS itself.
export const LANGUAGE_EXAM_OPTIONS = [
  "IELTS Academic",
  "IELTS General Training",
  "TOEFL iBT",
  "Duolingo English Test",
  "Pearson PTE Academic",
  "Cambridge C1 Advanced (CAE)",
  "Cambridge C2 Proficiency (CPE)",
  "CELPIP",
  "Occupational English Test (OET)",
];

export const ADMISSIONS_EXAM_OPTIONS = ["SAT", "ACT", "PSAT/NMSQT"];

export const OTHER_OPTION = "其他（自行輸入）";

// Score bounds (hint text AND the actual enforced min/max/increment)
// moved to lib/exam-score-bounds.ts as of Batch 9.17 — that file is the
// single source of truth for both what's displayed and what's enforced,
// so the two can never drift apart the way a separate "hint-only, not
// enforced" table could.
