"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createApplicationFor(
  studentId: string,
  returnPath: string,
  formData: FormData
) {
  const schoolName = (formData.get("school_name") as string)?.trim();
  const promptText = ((formData.get("prompt_text") as string) || "").trim();
  const wordLimitRaw = formData.get("word_limit") as string;
  const wordLimit = wordLimitRaw ? Number(wordLimitRaw) : null;
  const deadline = (formData.get("deadline") as string) || null;

  if (!schoolName) {
    redirect(`${returnPath}?error=missing_school_name`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Scope the school to the STUDENT's agency, regardless of which role
  // (student/advisor/agency admin) is the one creating this application.
  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", studentId)
    .single();

  if (!studentProfile?.agency_id) {
    redirect(`${returnPath}?error=no_agency`);
  }
  const agencyId = studentProfile.agency_id;

  let schoolId: string;
  const { data: existingSchool } = await supabase
    .from("schools")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("name", schoolName)
    .maybeSingle();

  if (existingSchool) {
    schoolId = existingSchool.id;
  } else {
    const { data: newSchool, error: schoolError } = await supabase
      .from("schools")
      .insert({ agency_id: agencyId, name: schoolName })
      .select("id")
      .single();

    if (schoolError || !newSchool) {
      console.error("createApplicationFor: failed to create school", schoolError);
      redirect(
        `${returnPath}?error=school_failed&detail=${encodeURIComponent(
          schoolError?.message || "unknown"
        )}`
      );
    }
    schoolId = newSchool.id;
  }

  const { error: appError } = await supabase.from("applications").insert({
    student_id: studentId,
    school_id: schoolId,
    prompt_text: promptText,
    word_limit: wordLimit,
    deadline,
  });

  if (appError) {
    console.error("createApplicationFor: failed to create application", appError);
    if (appError.code === "23505") {
      redirect(`${returnPath}?error=duplicate_school`);
    }
    redirect(`${returnPath}?error=application_failed&detail=${encodeURIComponent(appError.message)}`);
  }

  redirect(`${returnPath}?success=1`);
}
