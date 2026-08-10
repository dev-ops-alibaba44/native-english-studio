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

// Official IB Diploma Programme subject list (6 subject groups, each
// offered at HL and SL — see https://www.ibo.org/programmes/diploma-programme/curriculum/
// for the current group structure) plus the three core requirements.
// Extended Essay and Theory of Knowledge are graded A–E, not the 1–7
// subject scale; CAS has no grade at all, just a completion record —
// see lib/exam-score-bounds.ts for how each is validated. "其他" (added
// automatically below by TestScoreEditor) covers school-based syllabi,
// retired subjects, and anything else not on this list, plus lets a
// student log any other IB-related project that isn't a graded
// component at all.
export const IB_EXAM_OPTIONS = [
  // Group 1 — Studies in Language and Literature
  "IB Language A: Literature (HL)",
  "IB Language A: Literature (SL)",
  "IB Language A: Language and Literature (HL)",
  "IB Language A: Language and Literature (SL)",
  // Group 2 — Language Acquisition
  "IB Language B (HL)",
  "IB Language B (SL)",
  "IB Language ab initio (SL)",
  // Group 3 — Individuals and Societies
  "IB Business Management (HL)",
  "IB Business Management (SL)",
  "IB Economics (HL)",
  "IB Economics (SL)",
  "IB Geography (HL)",
  "IB Geography (SL)",
  "IB History (HL)",
  "IB History (SL)",
  "IB Psychology (HL)",
  "IB Psychology (SL)",
  "IB Global Politics (HL)",
  "IB Global Politics (SL)",
  "IB Philosophy (HL)",
  "IB Philosophy (SL)",
  // Group 4 — Sciences
  "IB Biology (HL)",
  "IB Biology (SL)",
  "IB Chemistry (HL)",
  "IB Chemistry (SL)",
  "IB Physics (HL)",
  "IB Physics (SL)",
  "IB Computer Science (HL)",
  "IB Computer Science (SL)",
  "IB Environmental Systems and Societies (SL)",
  "IB Sports, Exercise and Health Science (HL)",
  "IB Sports, Exercise and Health Science (SL)",
  // Group 5 — Mathematics
  "IB Mathematics: Analysis and Approaches (HL)",
  "IB Mathematics: Analysis and Approaches (SL)",
  "IB Mathematics: Applications and Interpretation (HL)",
  "IB Mathematics: Applications and Interpretation (SL)",
  // Group 6 — The Arts
  "IB Visual Arts (HL)",
  "IB Visual Arts (SL)",
  "IB Music (HL)",
  "IB Music (SL)",
  "IB Theatre (HL)",
  "IB Theatre (SL)",
  "IB Dance (HL)",
  "IB Dance (SL)",
  "IB Film (HL)",
  "IB Film (SL)",
  // Core requirements
  "Extended Essay (EE)",
  "Theory of Knowledge (TOK)",
  "CAS（創意、活動、服務 / Creativity, Activity, Service）",
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
