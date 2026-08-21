"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/site-url";
import { syncParentAccountFromStripe } from "@/lib/parent-billing";

// ---------------------------------------------------------------------
// Batch 27: parent's own equivalent of app/agency/billing/actions.ts's
// createPortalSession — hands off to Stripe's own hosted billing portal
// for viewing invoices, updating the payment method, or canceling.
// Cancellation itself (and, if it happens during the trial, the
// irreversible data wipe) is handled entirely by the Stripe webhook
// reacting to whatever the person does in that portal — this action's
// only job is getting them there.
// ---------------------------------------------------------------------
export async function createParentPortalSession() {
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
    throw new Error("Only a parent account can manage billing here.");
  }

  // Batch 28: same live-reconcile safety net as the billing page itself
  // — see lib/parent-billing.ts. Covers the case where this button is
  // clicked before the webhook (or a prior page load) has ever synced
  // stripe_customer_id onto this row yet.
  await syncParentAccountFromStripe(user.id);

  const { data: parentAccount } = await supabase
    .from("parent_accounts")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!parentAccount?.stripe_customer_id) {
    redirect("/parent/billing?error=no_subscription_yet");
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: parentAccount!.stripe_customer_id!,
    locale: "zh-TW",
    return_url: `${await getSiteUrl()}/parent/billing`,
  });

  redirect(session.url);
}
