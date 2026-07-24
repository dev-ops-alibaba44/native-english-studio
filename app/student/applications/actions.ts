"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createApplication(formData: FormData) {
  const schoolName = (formData.get("school_name") as string)?.trim();
  const promptText = ((formData.get("prompt_text") as string) || "").trim();
  const wordLimitRaw = formData.get("word_limit") as string;
  const wordLimit = wordLimitRaw ? Number(wordLimitRaw) : null;
  const deadline = (formData.get("deadline") as string) || null;

  if (!schoolName) {
    redirect("/student/applications?error=missing_school_name");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  // This used to fail silently — now it tells you exactly what's wrong
  // instead of just re-showing an empty form.
  if (!profile?.agency_id) {
    redirect("/student/applications?error=no_agency");
  }

  // Reuse an existing school with the same name in this agency, or create one.
  let schoolId: string;
  const { data: existingSchool } = await supabase
    .from("schools")
    .select("id")
    .eq("agency_id", profile.agency_id)
    .eq("name", schoolName)
    .maybeSingle();

  if (existingSchool) {
    schoolId = existingSchool.id;
  } else {
    const { data: newSchool, error: schoolError } = await supabase
      .from("schools")
      .insert({ agency_id: profile.agency_id, name: schoolName })
      .select("id")
      .single();

    if (schoolError || !newSchool) {
      console.error("createApplication: failed to create school", schoolError);
      redirect(
        `/student/applications?error=school_failed&detail=${encodeURIComponent(
          schoolError?.message || "unknown"
        )}`
      );
    }
    schoolId = newSchool.id;
  }

  const { error: appError } = await supabase.from("applications").insert({
    student_id: user.id,
    school_id: schoolId,
    prompt_text: promptText,
    word_limit: wordLimit,
    deadline,
  });

  if (appError) {
    console.error("createApplication: failed to create application", appError);
    // Postgres unique_violation code for the (student_id, school_id) unique constraint
    if (appError.code === "23505") {
      redirect("/student/applications?error=duplicate_school");
    }
    redirect(
      `/student/applications?error=application_failed&detail=${encodeURIComponent(appError.message)}`
    );
  }

  redirect("/student/applications?success=1");
}
