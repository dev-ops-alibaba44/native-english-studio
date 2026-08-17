"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function requireAgencyAdminForStudent(studentId: string) {
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
    throw new Error("Only an agency admin can edit a student's identity fields.");
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .from("profiles")
    .select(
      "id, agency_id, role, display_name, birthdate, birthdate_locked, chinese_name, chinese_name_locked, legal_first_name, legal_first_name_locked, legal_last_name, legal_last_name_locked, preferred_name, preferred_name_changed_at"
    )
    .eq("id", studentId)
    .maybeSingle();

  if (!student || student.agency_id !== profile.agency_id || student.role !== "student") {
    redirect("/agency/students?error=student_not_found");
  }

  return { admin, student: student! };
}

// One combined action covering all five fields — each field independently
// checks its own lock (or, for preferred_name, its own 30-day throttle)
// before applying, so a request that tries to sneak a change to a locked
// field through gets that one field silently ignored rather than
// rejecting the whole submission (a student's legitimate preferred-name
// update shouldn't fail just because the form also re-submitted an
// already-locked birthdate unchanged).
export async function updateStudentIdentity(studentId: string, formData: FormData) {
  const { admin, student } = await requireAgencyAdminForStudent(studentId);

  const updates: Record<string, unknown> = {};
  const rejected: string[] = [];

  const birthdate = (formData.get("birthdate") as string) || "";
  if (birthdate && !student.birthdate_locked) {
    updates.birthdate = birthdate;
    updates.birthdate_locked = true;
  } else if (birthdate && student.birthdate_locked) {
    rejected.push("birthdate");
  }

  const chineseName = ((formData.get("chinese_name") as string) || "").trim();
  if (chineseName && !student.chinese_name_locked) {
    updates.chinese_name = chineseName;
    updates.chinese_name_locked = true;
  } else if (chineseName && student.chinese_name_locked) {
    rejected.push("chinese_name");
  }

  const legalFirstName = ((formData.get("legal_first_name") as string) || "").trim();
  if (legalFirstName && !student.legal_first_name_locked) {
    updates.legal_first_name = legalFirstName;
    updates.legal_first_name_locked = true;
  } else if (legalFirstName && student.legal_first_name_locked) {
    rejected.push("legal_first_name");
  }

  const legalLastName = ((formData.get("legal_last_name") as string) || "").trim();
  if (legalLastName && !student.legal_last_name_locked) {
    updates.legal_last_name = legalLastName;
    updates.legal_last_name_locked = true;
  } else if (legalLastName && student.legal_last_name_locked) {
    rejected.push("legal_last_name");
  }

  const preferredName = ((formData.get("preferred_name") as string) || "").trim();
  if (preferredName) {
    const lastChangedMs = student.preferred_name_changed_at
      ? new Date(student.preferred_name_changed_at).getTime()
      : 0;
    const withinThrottle = Date.now() - lastChangedMs < THIRTY_DAYS_MS;
    if (withinThrottle && student.preferred_name_changed_at) {
      rejected.push("preferred_name");
    } else {
      updates.preferred_name = preferredName;
      updates.preferred_name_changed_at = new Date().toISOString();
    }
  }

  if (Object.keys(updates).length > 0) {
    // Batch: this is the actual bug behind Dan's report — every other
    // page (students list, advisor pages, prompts, calendar, the
    // student's own portal) reads profiles.display_name, which this
    // action never touched. Setting a legal/preferred name updated the
    // identity fields but left the placeholder sign-up name showing
    // everywhere. Recompute display_name here so it's the single
    // consistent source every other page already relies on: prefer the
    // student's chosen preferred name, then fall back to their legal
    // name, and only leave the original placeholder if neither has been
    // set yet.
    const nextPreferredName = (updates.preferred_name as string) ?? student.preferred_name;
    const nextLegalFirst = (updates.legal_first_name as string) ?? student.legal_first_name;
    const nextLegalLast = (updates.legal_last_name as string) ?? student.legal_last_name;
    const legalFullName = [nextLegalFirst, nextLegalLast].filter(Boolean).join(" ");
    const computedDisplayName = (nextPreferredName || legalFullName || "").trim();
    if (computedDisplayName && computedDisplayName !== student.display_name) {
      updates.display_name = computedDisplayName;
    }

    await admin.from("profiles").update(updates).eq("id", studentId);
  }

  const query = rejected.length > 0 ? `?error=fields_locked&fields=${rejected.join(",")}` : "?success=1";
  redirect(`/agency/students/${studentId}/identity${query}`);
}
