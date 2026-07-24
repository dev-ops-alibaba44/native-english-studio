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

  const advisors = (advisorsRaw || []).map((advisor) => {
    const theirStudents = students.filter((s) => s.primary_advisor_id === advisor.id);
    const theirStudentIds = new Set(theirStudents.map((s) => s.id));
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
