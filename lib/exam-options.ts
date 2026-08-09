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

// Shown as a placeholder hint next to the score field — not enforced,
// since scores can legitimately be reported in slightly different forms
// (e.g. a superscore vs a single-sitting score).
export const SCORE_HINTS: Record<string, string> = {
  "AP": "1–5",
  "IELTS Academic": "0–9（可含 0.5）",
  "IELTS General Training": "0–9（可含 0.5）",
  "TOEFL iBT": "0–120",
  "Duolingo English Test": "10–160",
  "Pearson PTE Academic": "10–90",
  "SAT": "400–1600",
  "ACT": "1–36",
  "PSAT/NMSQT": "320–1520",
};
