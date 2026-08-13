// Shared constants + validation for the two public, unauthenticated
// sign-up forms (agency inquiry + individual/parent waitlist). Imported
// by both the client form components and the server actions in
// app/actions/public.ts, so the two never drift — same house rule as
// exam-score-bounds.ts and grade-scales.ts: one source of truth for
// both the hint text and the actual enforcement.

export const ESTIMATED_STUDENT_BANDS = [
  "10 人以下",
  "10–30 人",
  "30–100 人",
  "100 人以上",
] as const;

export type EstimatedStudentBand = (typeof ESTIMATED_STUDENT_BANDS)[number];

export const WAITLIST_ROLES = [
  { value: "student", label: "學生" },
  { value: "parent", label: "家長" },
] as const;

export type WaitlistRole = (typeof WAITLIST_ROLES)[number]["value"];

// Deliberately simple — this only needs to catch obviously-malformed
// input client-side and reject junk server-side. Not meant to be a
// fully RFC-compliant email validator.
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidWaitlistRole(value: string): value is WaitlistRole {
  return WAITLIST_ROLES.some((r) => r.value === value);
}
