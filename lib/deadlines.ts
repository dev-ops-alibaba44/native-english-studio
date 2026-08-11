// Shared by student/advisor/agency calendar pages and the students-list
// sort feature (Batch 9.20) — one definition of "how many days left" and
// "is this overdue" so the three portals can't quietly drift apart on
// what counts as urgent.

export function daysRemaining(deadline: string): number {
  const ms = new Date(deadline + "T00:00:00").getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

// A "final" stage application is done — a past deadline on a finished
// application isn't something anyone needs flagged as urgent. Same
// definition already used in lib/agency-data.ts for the advisor-capacity
// dashboard; kept here too so calendar/sort views agree with it.
export function isOverdue(deadline: string | null, stage: string): boolean {
  if (!deadline || stage === "final") return false;
  return daysRemaining(deadline) < 0;
}

// For the advisor/agency students-list sort feature (Dan's request 4):
// find the soonest upcoming (or overdue) deadline across a student's
// applications, and use it to order both a list of applications and a
// list of students. No deadline at all sorts last in both cases, rather
// than being treated as "0" and jumping to the top.

export function earliestDeadline(applications: { deadline: string | null }[]): string | null {
  const dates = applications.map((a) => a.deadline).filter((d): d is string => Boolean(d));
  if (dates.length === 0) return null;
  return dates.sort()[0];
}

export function sortApplicationsByDeadline<T extends { deadline: string | null }>(apps: T[]): T[] {
  return [...apps].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
}

export function sortStudentsByDeadline<T extends { applications?: { deadline: string | null }[] | null }>(
  students: T[]
): T[] {
  return [...students].sort((a, b) => {
    const da = earliestDeadline(a.applications || []);
    const db = earliestDeadline(b.applications || []);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  });
}
