"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------
// Agency-initiated advisor sign-up (Batch 25) — the same pattern as
// app/actions/student-signup.ts, minus everything that's specific to
// students: no once-locked identity fields (name/DOB), no seat to pick
// or assign (advisors aren't billed per seat), no pending-deletion
// safety net (nothing here can fail partway in a way that leaves an
// unusable-but-undeleted account, since there's no second resource like
// a seat that has to attach afterward). Just an invited account with
// role='advisor' and an optional starting capacity — leaving capacity
// unset is fine and expected; null means "use the app's default of 25"
// per lib/capacity.ts, adjustable any time afterward on /agency/capacity.
// ---------------------------------------------------------------------
export async function createAdvisorAccount(formData: FormData) {
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
    throw new Error("Only an agency admin can sign up an advisor.");
  }
  const agencyId = profile.agency_id;
  const admin = createAdminClient();

  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const displayName = ((formData.get("display_name") as string) || "").trim();
  const capacityRaw = (formData.get("capacity") as string) || "";
  const capacity = capacityRaw.trim() ? Math.max(1, Math.floor(Number(capacityRaw))) : null;

  if (!email || !displayName) {
    redirect("/agency/advisors/new?error=missing_fields");
  }
  if (!EMAIL_RE.test(email)) {
    redirect("/agency/advisors/new?error=invalid_email");
  }
  if (capacityRaw.trim() && (!Number.isFinite(capacity) || (capacity as number) <= 0)) {
    redirect("/agency/advisors/new?error=invalid_capacity");
  }

  try {
    const siteUrl = await getSiteUrl();
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth/set-password`,
      data: { display_name: displayName },
    });

    if (inviteError || !invited?.user) {
      const alreadyRegistered = /already.*registered|already.*exists/i.test(
        inviteError?.message || ""
      );
      redirect(
        `/agency/advisors/new?error=${alreadyRegistered ? "email_taken" : "invite_failed"}`
      );
    }

    const newAdvisorId = invited!.user.id;

    // Same trigger-then-fill-in pattern as student sign-up: the
    // on_auth_user_created trigger already inserted a bare profiles row
    // (role='student' by default) — this promotes it to role='advisor'
    // and attaches it to the agency.
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        agency_id: agencyId,
        role: "advisor",
        email,
        display_name: displayName,
        capacity,
      })
      .eq("id", newAdvisorId);

    if (profileError) {
      redirect("/agency/advisors/new?error=profile_save_failed");
    }

    revalidatePath("/agency/capacity");
    revalidatePath("/agency");
    redirect("/agency/capacity?success=advisor_created");
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("createAdvisorAccount: unexpected error", err);
    redirect("/agency/advisors/new?error=unexpected_error");
  }
}
