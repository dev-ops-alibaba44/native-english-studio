"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------
// Batch 26: replaces the old single primary_advisor_id assignment with
// a "replace the whole set" update against student_advisors — the
// checkbox form on /agency/students sends every advisor_id currently
// checked, and this simply makes the table match that set exactly
// (delete what's no longer checked, insert what's newly checked).
// Capped at 3 both here and by a DB trigger (supabase/batch26_multi_
// advisor.sql) as defense in depth.
// ---------------------------------------------------------------------
export async function updateStudentAdvisors(studentId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "agency_admin" || !profile.agency_id) {
    throw new Error("Only an agency admin can assign advisors.");
  }
  const agencyId = profile.agency_id;
  const admin = createAdminClient();

  const { data: student } = await admin
    .from("profiles")
    .select("id, agency_id, role")
    .eq("id", studentId)
    .maybeSingle();
  if (!student || student.agency_id !== agencyId || student.role !== "student") {
    redirect("/agency/students?error=student_not_found");
  }

  const requestedAdvisorIds = formData.getAll("advisor_ids").map(String).filter(Boolean);
  if (requestedAdvisorIds.length > 3) {
    redirect("/agency/students?error=too_many_advisors");
  }

  // Only advisors that actually belong to this agency can be assigned —
  // silently drop anything else rather than trust the form body, since
  // it's just HTML a browser could be made to send arbitrary values in.
  const { data: validAdvisors } = requestedAdvisorIds.length
    ? await admin
        .from("profiles")
        .select("id")
        .in("id", requestedAdvisorIds)
        .eq("agency_id", agencyId)
        .eq("role", "advisor")
    : { data: [] as { id: string }[] };

  const validAdvisorIds = (validAdvisors || []).map((a) => a.id);

  await admin.from("student_advisors").delete().eq("student_id", studentId);
  if (validAdvisorIds.length > 0) {
    const { error: insertError } = await admin
      .from("student_advisors")
      .insert(validAdvisorIds.map((advisorId) => ({ student_id: studentId, advisor_id: advisorId })));
    if (insertError) {
      console.error("updateStudentAdvisors: insert failed", insertError);
      redirect("/agency/students?error=advisor_assign_failed");
    }
  }

  revalidatePath("/agency/students");
  revalidatePath("/agency/capacity");
  redirect("/agency/students?success=advisors_updated");
}
