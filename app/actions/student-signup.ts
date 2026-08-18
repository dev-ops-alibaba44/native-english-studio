"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------
// Agency-initiated student sign-up (Batch 23). Replaces the old model
// where the only way a student's name/DOB ever got into the system was
// an agency admin editing the once-locked fields on a profile that
// already existed somehow (self-signup, or manual Supabase dashboard
// work). This is the real thing: the agency creates the account, picks
// which unused seat it uses, and the student gets an email invite to
// set their own password — nothing usable exists until they do that,
// per Dan's call not to hand the agency a temp password to relay.
// ---------------------------------------------------------------------
export async function createStudentAccount(formData: FormData) {
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
    throw new Error("Only an agency admin can sign up a student.");
  }
  const agencyId = profile.agency_id;
  const admin = createAdminClient();

  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const chineseName = ((formData.get("chinese_name") as string) || "").trim();
  const legalFirstName = ((formData.get("legal_first_name") as string) || "").trim();
  const legalLastName = ((formData.get("legal_last_name") as string) || "").trim();
  const birthdate = ((formData.get("birthdate") as string) || "").trim();
  const preferredName = ((formData.get("preferred_name") as string) || "").trim();
  const seatId = (formData.get("seat_id") as string) || "";

  if (!email || !chineseName || !legalFirstName || !legalLastName || !birthdate || !seatId) {
    redirect("/agency/students/new?error=missing_fields");
  }
  if (!EMAIL_RE.test(email)) {
    redirect("/agency/students/new?error=invalid_email");
  }

  // Confirm the chosen seat is actually this agency's, and still free,
  // before creating any auth account — cheaper to fail here than to
  // create a real user and then discover the seat was already taken by
  // a concurrent submission.
  const { data: seat } = await admin
    .from("seats")
    .select("id, agency_id, status, assigned_student_id")
    .eq("id", seatId)
    .maybeSingle();
  if (
    !seat ||
    seat.agency_id !== agencyId ||
    seat.status !== "unused" ||
    seat.assigned_student_id
  ) {
    redirect("/agency/students/new?error=seat_unavailable");
  }

  const legalFullName = [legalFirstName, legalLastName].filter(Boolean).join(" ");
  const initialDisplayName = preferredName || legalFullName || chineseName;

  // Batch 25: the rest of this function is wrapped in try/catch because
  // an uncaught exception anywhere past this point (e.g. a transient
  // Supabase/SMTP hiccup) was producing a raw, unhelpful crash page
  // instead of a message the agency could act on. NEXT_REDIRECT is
  // Next.js's own mechanism for redirect() — it works by throwing, so it
  // has to be re-thrown here rather than swallowed, or every redirect()
  // call in this function would silently stop working.
  try {
    const siteUrl = await getSiteUrl();
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      // Points straight at the client page that can actually read the
      // session tokens Supabase's invite link returns — see the long
      // comment in app/auth/set-password/page.tsx for why /auth/callback
      // (a server Route Handler) can never work for this particular link
      // type, regardless of what "next" it's given.
      redirectTo: `${siteUrl}/auth/set-password`,
      data: { display_name: initialDisplayName },
    });

    if (inviteError || !invited?.user) {
      const alreadyRegistered = /already.*registered|already.*exists/i.test(
        inviteError?.message || ""
      );
      redirect(
        `/agency/students/new?error=${alreadyRegistered ? "email_taken" : "invite_failed"}`
      );
    }

    const newStudentId = invited!.user.id;

    // The on_auth_user_created trigger already inserted a bare profiles
    // row (role='student' by default, agency_id null) synchronously as
    // part of the user-creation transaction above — this fills it in
    // with everything the agency just entered, locking each identity
    // field immediately (same lock rules as the existing /identity page,
    // just applied at creation time instead of after the fact).
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        agency_id: agencyId,
        role: "student",
        email,
        display_name: initialDisplayName,
        birthdate,
        birthdate_locked: true,
        chinese_name: chineseName,
        chinese_name_locked: true,
        legal_first_name: legalFirstName,
        legal_first_name_locked: true,
        legal_last_name: legalLastName,
        legal_last_name_locked: true,
        ...(preferredName
          ? { preferred_name: preferredName, preferred_name_changed_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", newStudentId);

    if (profileError) {
      redirect("/agency/students/new?error=profile_save_failed");
    }

    // Guard against a race (two staff picking the same seat at once) by
    // only updating if the seat is still actually unassigned —
    // .select() lets us see whether a row really changed, not just
    // whether the query itself errored.
    const { data: assignedSeatRows, error: seatAssignError } = await admin
      .from("seats")
      .update({ assigned_student_id: newStudentId })
      .eq("id", seatId)
      .is("assigned_student_id", null)
      .select("id");

    if (seatAssignError || !assignedSeatRows || assignedSeatRows.length === 0) {
      // The account and profile both exist at this point, but the one
      // thing that makes the account actually usable — a seat — didn't
      // attach. Per Dan: don't leave this silently broken. Mark the
      // profile so the students page can surface a clear warning and
      // the cleanup cron (app/api/cron/cleanup-pending-students) can
      // remove it automatically if nobody fixes it within 7 days.
      await admin
        .from("profiles")
        .update({
          pending_seat_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", newStudentId);

      revalidatePath("/agency/students");
      redirect(`/agency/students?warning=seat_assignment_failed&student=${newStudentId}`);
    }

    revalidatePath("/agency/students");
    revalidatePath("/agency/billing/students");
    redirect("/agency/students?success=student_created");
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err; // a redirect() call above — let Next.js handle it normally
    }
    console.error("createStudentAccount: unexpected error", err);
    redirect("/agency/students/new?error=unexpected_error");
  }
}
