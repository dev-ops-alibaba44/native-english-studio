// Shared between components/ActivityEditor.tsx (client) and
// app/actions/activities.ts (server) — same reasoning as
// lib/grade-scales.ts: the client needs this for immediate inline
// feedback, the server needs the same rule as a final backstop.

// True if (m1, y1) comes strictly after (m2, y2). Missing month/year
// pieces are treated permissively (can't compare what isn't there yet —
// that's a "not filled in" state, not an ordering violation).
export function isAfterMonthYear(
  m1: number | null,
  y1: number | null,
  m2: number | null,
  y2: number | null
): boolean {
  if (y1 === null || y2 === null) return false;
  if (y1 !== y2) return y1 > y2;
  if (m1 === null || m2 === null) return false;
  return m1 > m2;
}

// A row's end date is invalid only when BOTH dates are fully filled in
// and the end date comes before the start date — an empty end date means
// "ongoing", which is always fine.
export function hasInvalidDateRange(
  startMonth: number | null,
  startYear: number | null,
  endMonth: number | null,
  endYear: number | null
): boolean {
  if (endMonth === null || endYear === null) return false;
  return isAfterMonthYear(startMonth, startYear, endMonth, endYear);
}
