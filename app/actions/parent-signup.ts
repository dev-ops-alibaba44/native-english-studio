"use server";

import { redirect } from "next/navigation";
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
// Item 6 (Batch 27): direct-to-consumer sign-up — a parent creates their
// own account (their own login, own password, set directly here same as
// agency self-signup, since nobody else exists yet to invite them) plus
// their first child's account (invited by email, same pattern as an
// agency admin signing up a student — the child sets their own
// password). Capped at 3 children total per parent (DB trigger in
// batch27_agency_and_parent_signup.sql; this form only ever creates the
// first one — additional children go through addChildAccount below).
//
// Trial mechanics per Dan's explicit spec:
//   - "start trial": Stripe Checkout with a 7-day trial. Card is
//     collected now but not charged until day 7. If the subscription is
//     canceled while still in trial, the Stripe webhook
//     (app/api/stripe/webhook/route.ts) irreversibly deletes the parent
//     account and every child under it — no soft-delete, no recovery.
//     AI usage is capped during the trial (lib/parent-trial.ts).
//   - "pay now": trial_period_days: 0 — charged immediately, no trial
//     window, no cancel-wipes-everything risk.
// Both paths are the SAME Checkout Session shape; only trial_period_days
// differs. The disclaimer explaining this is a required, separate
// checkbox from the standard legal-consent one (see the page component).
// ---------------------------------------------------------------------
export async function signUpParentAndFirstChild(formData: FormData) {
  const parentName = ((formData.get("parent_name") as string) || "").trim();
  const parentEmail = ((formData.get("parent_email") as string) || "").trim().toLowerCase();
  const parentPassword = (formData.get("parent_password") as string) || "";
  const parentConfirmPassword = (formData.get("parent_confirm_password") as string) || "";

  const childEmail = ((formData.get("child_email") as string) || "").trim().toLowerCase();
  const chineseName = ((formData.get("chinese_name") as string) || "").trim();
  const legalFirstName = ((formData.get("legal_first_name") as string) || "").trim();
  const legalLastName = ((formData.get("legal_last_name") as string) || "").trim();
  const birthdate = ((formData.get("birthdate") as string) || "").trim();
  const seatTier = (formData.get("seat_tier") as string) || "";
  const trialChoice = (formData.get("trial_choice") as string) || "start_trial";

  if (
    !parentName ||
    !parentEmail ||
    !parentPassword ||
    !childEmail ||
    !chineseName ||
    !legalFirstName ||
    !legalLastName ||
    !birthdate ||
    !seatTier
  ) {
    redirect("/signup/individual/create?error=missing_fields");
  }
  if (!EMAIL_RE.test(parentEmail) || !EMAIL_RE.test(childEmail)) {
    redirect("/signup/individual/create?error=invalid_email");
  }
  if (parentEmail === childEmail) {
    redirect("/signup/individual/create?error=same_email");
  }
  if (parentPassword.length < 8) {
    redirect("/signup/individual/create?error=password_too_short");
  }
  if (parentPassword !== parentConfirmPassword) {
    redirect("/signup/individual/create?error=password_mismatch");
  }
  if (seatTier !== "basic" && seatTier !== "advanced") {
    redirect("/signup/individual/create?error=invalid_tier");
  }
  if ((formData.get("agreed_to_terms") as string) !== "yes") {
    redirect("/signup/individual/create?error=must_agree_to_terms");
  }
  if ((formData.get("agreed_to_trial_terms") as string) !== "yes") {
    redirect("/signup/individual/create?error=must_agree_to_trial_terms");
  }

  const priceId = seatTier === "advanced" ? STRIPE_PRICE_PARENT_SEAT_ADVANCED : STRIPE_PRICE_PARENT_SEAT_BASIC;
  if (!priceId) {
    redirect("/signup/individual/create?error=stripe_not_configured");
  }

  const admin = createAdminClient();

  try {
    const { data: createdParent, error: parentCreateError } = await admin.auth.admin.createUser({
      email: parentEmail,
      password: parentPassword,
      email_confirm: true,
      user_metadata: { display_name: parentName },
    });
    if (parentCreateError || !createdParent?.user) {
      const alreadyRegistered = /already.*registered|already.*exists/i.test(
        parentCreateError?.message || ""
      );
      redirect(`/signup/individual/create?error=${alreadyRegistered ? "parent_email_taken" : "signup_failed"}`);
    }
    const parentId = createdParent!.user.id;

    const { error: parentProfileError } = await admin
      .from("profiles")
      .update({ role: "parent", display_name: parentName, email: parentEmail })
      .eq("id", parentId);
    if (parentProfileError) {
      await admin.auth.admin.deleteUser(parentId);
      redirect("/signup/individual/create?error=signup_failed");
    }

    const { error: parentAccountError } = await admin
      .from("parent_accounts")
      .insert({ id: parentId, plan_status: "inactive" });
    if (parentAccountError) {
      await admin.auth.admin.deleteUser(parentId);
      redirect("/signup/individual/create?error=signup_failed");
    }

    const legalFullName = [legalFirstName, legalLastName].filter(Boolean).join(" ");
    const childDisplayName = legalFullName || chineseName;
    const siteUrl = await getSiteUrl();

    const { data: invitedChild, error: childInviteError } = await admin.auth.admin.inviteUserByEmail(
      childEmail,
      {
        redirectTo: `${siteUrl}/auth/set-password`,
        data: { display_name: childDisplayName },
      }
    );
    if (childInviteError || !invitedChild?.user) {
      const alreadyRegistered = /already.*registered|already.*exists/i.test(
        childInviteError?.message || ""
      );
      await admin.auth.admin.deleteUser(parentId);
      redirect(`/signup/individual/create?error=${alreadyRegistered ? "child_email_taken" : "signup_failed"}`);
    }
    const childId = invitedChild!.user.id;

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
      .eq("id", childId);
    if (childProfileError) {
      await admin.auth.admin.deleteUser(childId);
      await admin.auth.admin.deleteUser(parentId);
      redirect("/signup/individual/create?error=signup_failed");
    }

    // Log in as the PARENT — they're the one who'll land on the billing
    // confirmation / dashboard after Checkout, not the child (who isn't
    // even active yet; they still need to click their own invite email).
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parentEmail,
      password: parentPassword,
    });
    if (signInError) {
      redirect("/login?error=signup_login_failed");
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      locale: "zh-TW",
      client_reference_id: parentId,
      customer_email: parentEmail,
      subscription_data: {
        trial_period_days: trialChoice === "pay_now" ? 0 : 7,
        metadata: { kind: "parent", parent_id: parentId, child_id: childId, seat_tier: seatTier },
      },
      metadata: { kind: "parent", parent_id: parentId, child_id: childId, seat_tier: seatTier },
      success_url: `${siteUrl}/parent/billing?checkout=success`,
      cancel_url: `${siteUrl}/parent/billing?checkout=canceled`,
    });

    if (!session.url) {
      redirect("/parent/billing?error=checkout_failed");
    }
    redirect(session.url);
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("signUpParentAndFirstChild: unexpected error", err);
    redirect("/signup/individual/create?error=unexpected_error");
  }
}
