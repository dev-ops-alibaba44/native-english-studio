import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_ADVISOR_CAPACITY } from "@/lib/capacity";

function isOverdue(deadline: string | null, stage: string): boolean {
  if (!deadline || stage === "final") return false;
  return new Date(deadline + "T00:00:00").getTime() < new Date().setHours(0, 0, 0, 0);
}

export async function getAgencyDashboardData(supabase: SupabaseClient, agencyId: string) {
  const { data: advisorsRaw } = await supabase
    .from("profiles")
    .select("id, display_name, capacity")
    .eq("agency_id", agencyId)
    .eq("role", "advisor");

  const { data: studentsRaw } = await supabase
    .from("profiles")
    .select("id, display_name, primary_advisor_id")
    .eq("agency_id", agencyId)
    .eq("role", "student");

  const students = studentsRaw || [];
  const studentIds = students.map((s) => s.id);

  const { data: applicationsRaw } = studentIds.length
    ? await supabase
        .from("applications")
        .select("id, deadline, stage, student_id, schools(name)")
        .in("student_id", studentIds)
    : { data: [] as any[] };

  const applications = applicationsRaw || [];

  // Batch 26: caseload/overdue counts now come from student_advisors
  // (up to 3 advisors per student) instead of the old one-advisor-only
  // primary_advisor_id — a student assigned to multiple advisors counts
  // toward every one of their caseloads, since each of them is actually
  // responsible for that student.
  const { data: assignmentsRaw } = studentIds.length
    ? await supabase.from("student_advisors").select("student_id, advisor_id").in("student_id", studentIds)
    : { data: [] as { student_id: string; advisor_id: string }[] };
  const assignments = assignmentsRaw || [];

  const advisors = (advisorsRaw || []).map((advisor) => {
    const theirStudentIds = new Set(
      assignments.filter((a) => a.advisor_id === advisor.id).map((a) => a.student_id)
    );
    const theirStudents = students.filter((s) => theirStudentIds.has(s.id));
    const theirApplications = applications.filter((a: any) => theirStudentIds.has(a.student_id));
    const overdueCount = theirApplications.filter((a: any) => isOverdue(a.deadline, a.stage)).length;

    return {
      ...advisor,
      capacity: advisor.capacity ?? DEFAULT_ADVISOR_CAPACITY,
      caseload: theirStudents.length,
      overdueCount,
      students: theirStudents,
    };
  });

  const totalOverdue = applications.filter((a: any) => isOverdue(a.deadline, a.stage)).length;

  return { advisors, students, applications, totalOverdue };
}
