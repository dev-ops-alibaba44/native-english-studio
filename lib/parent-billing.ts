import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { mapParentSubscriptionStatus } from "@/lib/seats";

// ---------------------------------------------------------------------
// Batch 28 (fix for Dan's items 2 & 3): before this, a parent's
// plan_status was ONLY ever updated by the Stripe webhook — nothing in
// the app ever checked back with Stripe directly. If the webhook is
// slow, misconfigured, or (very commonly in local dev) never reaches
// this server at all because `stripe listen --forward-to
// localhost:3000/api/stripe/webhook` isn't running, plan_status gets
// stuck on 'inactive' forever even though the payment genuinely
// succeeded on Stripe's side. That stuck flag is exactly what
// `assertSeatActive()` in lib/seats.ts then correctly (but
// unhelpfully) blocks on — which is what Dan hit in testing (Stripe
// showed the payment went through; the app never found out).
//
// Same philosophy as Batch 21's `effectiveExpiresAt()`: don't only
// trust a stored value that depends on some other write path having
// already run — derive the true state live from the source of truth
// (Stripe) whenever there's a cheap, obvious moment to check. This
// function is that check for parent accounts. It's safe to call as
// often as needed (idempotent — just re-applies whatever Stripe
// currently reports), and it deliberately SUPPLEMENTS rather than
// replaces the webhook: the webhook is still what reacts to
// cancellation/deletion events pushed from Stripe when nobody is
// looking at the app at all. This is only a same-second safety net for
// the moments the app IS being looked at (right after checkout, or any
// time the billing page loads) so the UI never shows a stale "not
// active" state the person can't explain.
// ---------------------------------------------------------------------
export async function syncParentAccountFromStripe(
  parentId: string,
  checkoutSessionId?: string | null
): Promise<void> {
  const admin = createAdminClient();

  const { data: parentAccount } = await admin
    .from("parent_accounts")
    .select("plan_status, stripe_customer_id, stripe_subscription_id")
    .eq("id", parentId)
    .maybeSingle();
  if (!parentAccount) return;

  let customerId = parentAccount.stripe_customer_id as string | null;
  let subscriptionId = parentAccount.stripe_subscription_id as string | null;

  // Fresh from checkout: the webhook may not have landed yet, but the
  // Checkout Session itself already has everything we need, straight
  // from Stripe, no waiting required.
  if (checkoutSessionId && (!customerId || !subscriptionId)) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(checkoutSessionId);
      // Safety: only ever reconcile using a session that's actually
      // this parent's own checkout, never trust the query param alone.
      if (session.metadata?.kind === "parent" && session.metadata?.parent_id === parentId) {
        if (session.customer) {
          customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
        }
        if (session.subscription) {
          subscriptionId =
            typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        }
      }
    } catch (err) {
      console.error("syncParentAccountFromStripe: failed to retrieve checkout session", err);
    }
  }

  if (!customerId) return; // nothing to reconcile against yet

  // No subscription id on file at all (e.g. webhook never ran and this
  // wasn't a checkout-success page load) — look it up by customer as a
  // last resort, taking whichever subscription is most recent.
  if (!subscriptionId) {
    try {
      const subs = await getStripe().subscriptions.list({ customer: customerId, limit: 1 });
      if (subs.data[0]) subscriptionId = subs.data[0].id;
    } catch (err) {
      console.error("syncParentAccountFromStripe: failed to list subscriptions", err);
    }
  }
  if (!subscriptionId) return;

  try {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    await admin
      .from("parent_accounts")
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        plan_status: mapParentSubscriptionStatus(subscription.status),
        trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq("id", parentId);
  } catch (err) {
    console.error("syncParentAccountFromStripe: failed to retrieve/apply subscription", err);
    return;
  }

  // Piggyback the invoice-history backfill onto the same reconciliation
  // pass — cheap, and means the "帳單紀錄" list is never stuck empty for
  // the same reason plan_status could get stuck (a webhook that hasn't
  // fired yet). See syncParentInvoiceHistory below.
  await syncParentInvoiceHistory(parentId, customerId);
}

// ---------------------------------------------------------------------
// Item 1 fix: parents now get a real invoice-history table
// (parent_billing_events, batch28_parent_billing_and_fixes.sql) instead
// of only the Stripe-hosted billing portal. The webhook's `invoice.paid`
// handler (app/api/stripe/webhook/route.ts) is the primary writer going
// forward; this function is the same live-reconciliation safety net as
// syncParentAccountFromStripe above, so the list is never empty just
// because a webhook delivery hasn't landed yet.
// ---------------------------------------------------------------------
export async function syncParentInvoiceHistory(parentId: string, customerId: string): Promise<void> {
  const admin = createAdminClient();
  try {
    const invoices = await getStripe().invoices.list({ customer: customerId, limit: 20 });
    for (const invoice of invoices.data) {
      if (invoice.status !== "paid") continue;
      await admin.from("parent_billing_events").upsert(
        {
          parent_id: parentId,
          stripe_event_id: `invoice_${invoice.id}`,
          type: "invoice.paid",
          amount_total: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status,
          hosted_invoice_url: invoice.hosted_invoice_url,
          created_at: new Date(invoice.created * 1000).toISOString(),
        },
        { onConflict: "stripe_event_id" }
      );
    }
  } catch (err) {
    console.error("syncParentInvoiceHistory: failed to list/upsert invoices", err);
  }
}
