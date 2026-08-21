"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import {
  getStripe,
  STRIPE_PRICE_PARENT_SEAT_BASIC,
  STRIPE_PRICE_PARENT_SEAT_ADVANCED,
} from "@/lib/stripe";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------
// Batch 27: adding the 2nd or 3rd child to an existing parent account
// (the 1st is created at signup — app/actions/parent-signup.ts). Adds a
// new line item to the parent's EXISTING Stripe subscription (same
// pattern as addSeats() for agencies) rather than creating a second
// subscription — one bill per parent, one line item per child.
// ---------------------------------------------------------------------
export async function addChildAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "parent") {
    throw new Error("Only a parent account can add a child.");
  }
  const parentId = user.id;
  const admin = createAdminClient();

  const { data: parentAccount } = await admin
    .from("parent_accounts")
    .select("stripe_subscription_id, plan_status")
    .eq("id", parentId)
    .maybeSingle();

  if (!parentAccount || !["trialing", "active"].includes(parentAccount.plan_status)) {
    redirect("/parent/children/new?error=account_inactive");
  }
  if (!parentAccount!.stripe_subscription_id) {
    redirect("/parent/children/new?error=account_inactive");
  }

  const { count: existingChildCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", parentId);
  if ((existingChildCount || 0) >= 3) {
    redirect("/parent/children/new?error=max_children_reached");
  }

  const childEmail = ((formData.get("child_email") as string) || "").trim().toLowerCase();
  const chineseName = ((formData.get("chinese_name") as string) || "").trim();
  const legalFirstName = ((formData.get("legal_first_name") as string) || "").trim();
  const legalLastName = ((formData.get("legal_last_name") as string) || "").trim();
  const birthdate = ((formData.get("birthdate") as string) || "").trim();
  const seatTier = (formData.get("seat_tier") as string) || "";

  if (!childEmail || !chineseName || !legalFirstName || !legalLastName || !birthdate || !seatTier) {
    redirect("/parent/children/new?error=missing_fields");
  }
  if (!EMAIL_RE.test(childEmail)) {
    redirect("/parent/children/new?error=invalid_email");
  }
  if (seatTier !== "basic" && seatTier !== "advanced") {
    redirect("/parent/children/new?error=invalid_tier");
  }

  const priceId = seatTier === "advanced" ? STRIPE_PRICE_PARENT_SEAT_ADVANCED : STRIPE_PRICE_PARENT_SEAT_BASIC;
  if (!priceId) {
    redirect("/parent/children/new?error=stripe_not_configured");
  }

  try {
    // Add the new line item to Stripe FIRST — if this fails, nothing
    // else has happened yet, which is a simpler failure mode than
    // creating the child account first and then discovering billing
    // doesn't work.
    await getStripe().subscriptionItems.create({
      subscription: parentAccount!.stripe_subscription_id!,
      price: priceId,
      quantity: 1,
      proration_behavior: "create_prorations",
    });

    const siteUrl = await getSiteUrl();
    const legalFullName = [legalFirstName, legalLastName].filter(Boolean).join(" ");
    const childDisplayName = legalFullName || chineseName;

    const { data: invitedChild, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      childEmail,
      {
        redirectTo: `${siteUrl}/auth/set-password`,
        data: { display_name: childDisplayName },
      }
    );
    if (inviteError || !invitedChild?.user) {
      const alreadyRegistered = /already.*registered|already.*exists/i.test(inviteError?.message || "");
      redirect(`/parent/children/new?error=${alreadyRegistered ? "child_email_taken" : "invite_failed"}`);
    }

    const { error: childProfileError } = await admin
      .from("profiles")
      .update({
        role: "student",
        parent_id: parentId,
        display_name: childDisplayName,
        email: childEmail,
        birthdate,
        birthdate_locked: true,
        chinese_name: chineseName,
        chinese_name_locked: true,
        legal_first_name: legalFirstName,
        legal_first_name_locked: true,
        legal_last_name: legalLastName,
        legal_last_name_locked: true,
        seat_tier: seatTier,
      })
      .eq("id", invitedChild!.user.id);

    if (childProfileError) {
      redirect("/parent/children/new?error=profile_save_failed");
    }

    revalidatePath("/parent");
    redirect("/parent?success=child_added");
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("addChildAccount: unexpected error", err);
    redirect("/parent/children/new?error=unexpected_error");
  }
}
