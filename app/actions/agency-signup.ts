"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import { getStripe, STRIPE_PRICE_LICENSE } from "@/lib/stripe";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------
// Item 5 (Batch 27): a real, public, unauthenticated self-signup for
// agencies — distinct from every other account-creation flow in this
// app so far, which all start from an ALREADY-LOGGED-IN agency_admin
// inviting someone else. Here nobody is logged in yet; the person
// signing up sets their own password directly (there's no one else to
// send an invite email), and the very first thing that happens after
// account creation is being dropped straight into Stripe Checkout for
// the $2,000 license fee. Per Dan: fully automatic, no approval step —
// the moment Stripe confirms payment, the existing webhook (unchanged,
// see app/api/stripe/webhook/route.ts) activates the agency exactly the
// same way it already does for agencies Dan sets up by hand. This
// action's only job is getting a brand-new agency + admin account to
// the front door of that same, already-proven activation path.
// ---------------------------------------------------------------------
export async function signUpAgency(formData: FormData) {
  const agencyName = ((formData.get("agency_name") as string) || "").trim();
  const adminName = ((formData.get("admin_name") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = (formData.get("password") as string) || "";
  const confirmPassword = (formData.get("confirm_password") as string) || "";

  if (!agencyName || !adminName || !email || !password) {
    redirect("/signup/agency/create?error=missing_fields");
  }
  if ((formData.get("agreed_to_terms") as string) !== "yes") {
    redirect("/signup/agency/create?error=must_agree_to_terms");
  }
  if (!EMAIL_RE.test(email)) {
    redirect("/signup/agency/create?error=invalid_email");
  }
  if (password.length < 8) {
    redirect("/signup/agency/create?error=password_too_short");
  }
  if (password !== confirmPassword) {
    redirect("/signup/agency/create?error=password_mismatch");
  }
  if (!STRIPE_PRICE_LICENSE) {
    redirect("/signup/agency/create?error=stripe_not_configured");
  }

  const admin = createAdminClient();

  try {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // no one to send an invite from — they just set their own password
      user_metadata: { display_name: adminName },
    });

    if (createError || !created?.user) {
      const alreadyRegistered = /already.*registered|already.*exists/i.test(
        createError?.message || ""
      );
      redirect(`/signup/agency/create?error=${alreadyRegistered ? "email_taken" : "signup_failed"}`);
    }

    const newAdminId = created!.user.id;

    const { data: agency, error: agencyError } = await admin
      .from("agencies")
      .insert({ name: agencyName })
      .select("id")
      .single();

    if (agencyError || !agency) {
      // Best-effort cleanup so a broken partial signup doesn't leave a
      // permanently-unusable email address behind — the person should
      // be able to just try again.
      await admin.auth.admin.deleteUser(newAdminId);
      redirect("/signup/agency/create?error=signup_failed");
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        role: "agency_admin",
        agency_id: agency.id,
        display_name: adminName,
        email,
      })
      .eq("id", newAdminId);

    if (profileError) {
      await admin.auth.admin.deleteUser(newAdminId);
      redirect("/signup/agency/create?error=signup_failed");
    }

    // Log them in — this is the public signup flow, so there's no
    // existing session to inherit the way an invite-link flow has.
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      redirect("/login?error=signup_login_failed");
    }

    const siteUrl = await getSiteUrl();
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: STRIPE_PRICE_LICENSE, quantity: 1 }],
      locale: "zh-TW",
      client_reference_id: agency.id,
      customer_email: email,
      subscription_data: {
        trial_period_days: 7,
        metadata: { agency_id: agency.id, kind: "license" },
      },
      metadata: {
        agency_id: agency.id,
        admission_cycle_end_year: "",
        requested_standard_seats: "0",
        requested_premium_seats: "0",
      },
      success_url: `${siteUrl}/agency/billing?checkout=success`,
      cancel_url: `${siteUrl}/agency/billing?checkout=canceled`,
    });

    if (!session.url) {
      redirect("/agency/billing?error=checkout_failed");
    }
    redirect(session.url);
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("signUpAgency: unexpected error", err);
    redirect("/signup/agency/create?error=unexpected_error");
  }
}
