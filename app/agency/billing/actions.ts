"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getStripe,
  STRIPE_PRICE_LICENSE,
} from "@/lib/stripe";
import { getSiteUrl } from "@/lib/site-url";

async function requireAgencyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, agency_id, display_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "agency_admin" || !profile.agency_id) {
    throw new Error("Only an agency admin can manage billing.");
  }

  const { data: agency } = await supabase
    .from("agencies")
    .select("id, name, stripe_customer_id, stripe_subscription_id")
    .eq("id", profile.agency_id)
    .single();

  if (!agency) throw new Error("Agency not found.");

  return { supabase, user, profile, agency };
}

export async function createCheckoutSession(formData: FormData) {
  const { user, agency } = await requireAgencyAdmin();

  // SAFETY STOPGAP (added after a real double-billing incident in testing):
  // this function creates a brand-new Checkout Session, which means a brand
  // new subscription — including the license line item again. It must only
  // ever run for an agency's FIRST subscription. Once an agency already has
  // a subscription, seat changes have to modify that existing subscription
  // instead (proper seat-lifecycle rules — add/upgrade/cancel-within-7-days
  // — are coming in a follow-up batch). Until that ships, block this path
  // entirely for already-subscribed agencies rather than risk a repeat.
  if (agency.stripe_subscription_id) {
    redirect(`/agency/billing?error=use_add_seats_soon`);
  }

  const standardSeats = Math.max(0, Number(formData.get("standard_seats") || 0));
  const premiumSeats = Math.max(0, Number(formData.get("premium_seats") || 0));

  // Batch 20: initial seats need an admission cycle too, same as seats
  // added later via addSeats() — read by the webhook when it creates
  // these seats' rows, via session/subscription metadata (a Checkout
  // Session can't insert into our DB directly; the webhook does that
  // once Stripe confirms payment).
  const cycleEndYear = Math.floor(Number(formData.get("admission_cycle_end_year") || 0));
  const currentYear = new Date().getFullYear();
  if (
    (standardSeats > 0 || premiumSeats > 0) &&
    (!cycleEndYear || cycleEndYear < currentYear || cycleEndYear > currentYear + 6)
  ) {
    redirect(`/agency/billing?error=invalid_admission_cycle`);
  }

  if (!process.env.STRIPE_SECRET_KEY || !STRIPE_PRICE_LICENSE) {
    redirect(`/agency/billing?error=stripe_not_configured`);
  }

  const line_items: { price: string; quantity: number }[] = [
    { price: STRIPE_PRICE_LICENSE, quantity: 1 },
  ];
  // Batch 22: seats are NOT line items on this checkout anymore — this
  // session creates the LICENSE subscription only. If seats were also
  // requested, the webhook creates a completely separate seats
  // subscription right after this one confirms, using the payment
  // method this checkout just saved on the customer. That's what makes
  // the two subscriptions bill, renew, and cancel independently instead
  // of showing one combined total.

  const siteUrl = await getSiteUrl();
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items,
    // Batch: force Traditional Chinese regardless of the browser's
    // language — Stripe was defaulting to English for Dan's test browser.
    locale: "zh-TW",
    client_reference_id: agency.id,
    customer: agency.stripe_customer_id || undefined,
    customer_email: agency.stripe_customer_id ? undefined : user.email || undefined,
    subscription_data: {
      // 7-day free trial on the license subscription. The seats
      // subscription (created separately in the webhook) gets its own
      // independent 7-day trial too.
      trial_period_days: 7,
      metadata: { agency_id: agency.id, kind: "license" },
    },
    metadata: {
      agency_id: agency.id,
      admission_cycle_end_year: cycleEndYear ? String(cycleEndYear) : "",
      requested_standard_seats: String(standardSeats),
      requested_premium_seats: String(premiumSeats),
    },
    success_url: `${siteUrl}/agency/billing?checkout=success`,
    cancel_url: `${siteUrl}/agency/billing?checkout=canceled`,
  });

  if (!session.url) {
    redirect(`/agency/billing?error=checkout_failed`);
  }

  redirect(session.url);
}

export async function createPortalSession() {
  const { agency } = await requireAgencyAdmin();

  if (!process.env.STRIPE_SECRET_KEY) {
    redirect(`/agency/billing?error=stripe_not_configured`);
  }

  if (!agency.stripe_customer_id) {
    redirect(`/agency/billing?error=no_subscription_yet`);
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: agency.stripe_customer_id,
    locale: "zh-TW",
    return_url: `${await getSiteUrl()}/agency/billing`,
  });

  redirect(session.url);
}
