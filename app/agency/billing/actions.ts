"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getStripe,
  STRIPE_PRICE_LICENSE,
  STRIPE_PRICE_SEAT_STANDARD,
  STRIPE_PRICE_SEAT_PREMIUM,
} from "@/lib/stripe";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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

  if (!process.env.STRIPE_SECRET_KEY || !STRIPE_PRICE_LICENSE) {
    redirect(`/agency/billing?error=stripe_not_configured`);
  }

  const line_items: { price: string; quantity: number }[] = [
    { price: STRIPE_PRICE_LICENSE, quantity: 1 },
  ];
  if (standardSeats > 0 && STRIPE_PRICE_SEAT_STANDARD) {
    line_items.push({ price: STRIPE_PRICE_SEAT_STANDARD, quantity: standardSeats });
  }
  if (premiumSeats > 0 && STRIPE_PRICE_SEAT_PREMIUM) {
    line_items.push({ price: STRIPE_PRICE_SEAT_PREMIUM, quantity: premiumSeats });
  }

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items,
    client_reference_id: agency.id,
    customer: agency.stripe_customer_id || undefined,
    customer_email: agency.stripe_customer_id ? undefined : user.email || undefined,
    subscription_data: {
      // 7-day free trial, applied to the whole subscription — this covers
      // the license line item and every seat line item together (Stripe
      // trials are set at the subscription level, not per-line-item; there
      // is no way to trial only some items in one subscription). Dan
      // confirmed both the license and seats should trial together.
      trial_period_days: 7,
      metadata: { agency_id: agency.id },
    },
    metadata: { agency_id: agency.id },
    success_url: `${SITE_URL}/agency/billing?checkout=success`,
    cancel_url: `${SITE_URL}/agency/billing?checkout=canceled`,
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
    return_url: `${SITE_URL}/agency/billing`,
  });

  redirect(session.url);
}
