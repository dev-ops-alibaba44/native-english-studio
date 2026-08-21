import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, STRIPE_PRICE_SEAT_STANDARD, STRIPE_PRICE_SEAT_PREMIUM } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { admissionCycleExpiry, mapSubscriptionStatus, mapParentSubscriptionStatus } from "@/lib/seats";

// Stripe requires the raw request body (unparsed) to verify the signature,
// so this route must NOT run any body-parsing middleware. App Router route
// handlers don't parse the body automatically, so req.text() below is safe.
export const runtime = "nodejs";

function seatCountsFromSubscription(sub: Stripe.Subscription): {
  standard_seats: number;
  premium_seats: number;
} {
  let standard_seats = 0;
  let premium_seats = 0;
  for (const item of sub.items.data) {
    const priceId = typeof item.price === "string" ? item.price : item.price?.id;
    if (priceId === STRIPE_PRICE_SEAT_STANDARD) standard_seats += item.quantity || 0;
    if (priceId === STRIPE_PRICE_SEAT_PREMIUM) premium_seats += item.quantity || 0;
  }
  return { standard_seats, premium_seats };
}

async function findAgencyForCustomer(
  admin: ReturnType<typeof createAdminClient>,
  customerId: string
): Promise<{ id: string; stripe_subscription_id: string | null; stripe_seats_subscription_id: string | null } | null> {
  const { data } = await admin
    .from("agencies")
    .select("id, stripe_subscription_id, stripe_seats_subscription_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data ?? null;
}

// Batch 27: parent accounts are looked up the same way agencies are —
// by stripe_customer_id — since customer.subscription.updated/deleted
// events only carry a customer ID, not our own metadata, once the
// subscription already exists.
async function findParentAccountForCustomer(
  admin: ReturnType<typeof createAdminClient>,
  customerId: string
): Promise<{ id: string; plan_status: string } | null> {
  const { data } = await admin
    .from("parent_accounts")
    .select("id, plan_status")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data ?? null;
}

// Batch 27: the irreversible part of Dan's trial-cancellation spec —
// "if they cancel on day 6, ALL the data gets erased, no way to
// recover." Only ever called when a parent's subscription is canceled
// WHILE plan_status was still 'trialing' in our own database (i.e. no
// checkout/payment event had ever flipped it to 'active') — a parent
// who converted to paid and cancels later is NOT affected by this; that
// path just deactivates the account like an agency cancellation does,
// handled separately below.
async function wipeParentAccount(admin: ReturnType<typeof createAdminClient>, parentId: string) {
  const { data: children } = await admin.from("profiles").select("id").eq("parent_id", parentId);
  for (const child of children || []) {
    await admin.auth.admin.deleteUser(child.id);
  }
  // Cascades to the profiles row and parent_accounts row via their
  // "on delete cascade" foreign keys — no separate deletes needed.
  await admin.auth.admin.deleteUser(parentId);
  console.log(`wipeParentAccount: erased parent ${parentId} and ${children?.length || 0} child account(s) after trial cancellation.`);
}

// Batch 22: creates the seats subscription as its own separate Stripe
// Subscription object (not line items on the license subscription), so
// it bills, renews, and cancels independently. Called right after the
// license Checkout Session completes, using the payment method that
// checkout just saved on the customer — no second checkout page needed.
async function createSeatsSubscription(
  admin: ReturnType<typeof createAdminClient>,
  agencyId: string,
  customerId: string,
  standardSeats: number,
  premiumSeats: number,
  cycleEndYear: number | null
) {
  const items: { price: string; quantity: number }[] = [];
  if (standardSeats > 0 && STRIPE_PRICE_SEAT_STANDARD) {
    items.push({ price: STRIPE_PRICE_SEAT_STANDARD, quantity: standardSeats });
  }
  if (premiumSeats > 0 && STRIPE_PRICE_SEAT_PREMIUM) {
    items.push({ price: STRIPE_PRICE_SEAT_PREMIUM, quantity: premiumSeats });
  }
  if (items.length === 0) return;

  const seatsSubscription = await getStripe().subscriptions.create({
    customer: customerId,
    items,
    trial_period_days: 7,
    metadata: { agency_id: agencyId, kind: "seats" },
  });

  const { standard_seats, premium_seats } = seatCountsFromSubscription(seatsSubscription);

  await admin
    .from("agencies")
    .update({
      stripe_seats_subscription_id: seatsSubscription.id,
      seats_plan_status: mapSubscriptionStatus(seatsSubscription.status),
      seats_current_period_end: new Date(seatsSubscription.current_period_end * 1000).toISOString(),
      standard_seats,
      premium_seats,
    })
    .eq("id", agencyId);

  const cycleExpiresAt =
    cycleEndYear && cycleEndYear > 0 ? admissionCycleExpiry(cycleEndYear).toISOString() : null;

  const seatRows: {
    agency_id: string;
    seat_type: "standard" | "premium";
    status: "unused";
    stripe_subscription_item_id: string | undefined;
    admission_cycle_end_year: number | null;
    expires_at?: string;
  }[] = [];
  for (const item of seatsSubscription.items.data) {
    const priceId = typeof item.price === "string" ? item.price : item.price?.id;
    if (priceId === STRIPE_PRICE_SEAT_STANDARD) {
      for (let i = 0; i < (item.quantity || 0); i++) {
        seatRows.push({
          agency_id: agencyId,
          seat_type: "standard",
          status: "unused",
          stripe_subscription_item_id: item.id,
          admission_cycle_end_year: cycleEndYear,
          ...(cycleExpiresAt ? { expires_at: cycleExpiresAt } : {}),
        });
      }
    }
    if (priceId === STRIPE_PRICE_SEAT_PREMIUM) {
      for (let i = 0; i < (item.quantity || 0); i++) {
        seatRows.push({
          agency_id: agencyId,
          seat_type: "premium",
          status: "unused",
          stripe_subscription_item_id: item.id,
          admission_cycle_end_year: cycleEndYear,
          ...(cycleExpiresAt ? { expires_at: cycleExpiresAt } : {}),
        });
      }
    }
  }
  if (seatRows.length > 0) {
    await admin.from("seats").insert(seatRows);
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Batch 27: parent checkouts are tagged kind='parent' in
        // metadata at creation time (app/actions/parent-signup.ts) —
        // checked first since parent and agency checkouts otherwise
        // share the same event type and client_reference_id shape.
        if (session.metadata?.kind === "parent") {
          const parentId = session.metadata?.parent_id as string | undefined;
          if (!parentId || !session.subscription || !session.customer) break;

          const subscription = await getStripe().subscriptions.retrieve(
            typeof session.subscription === "string" ? session.subscription : session.subscription.id
          );
          const customerId =
            typeof session.customer === "string" ? session.customer : session.customer.id;

          await admin
            .from("parent_accounts")
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              plan_status: mapParentSubscriptionStatus(subscription.status),
              trial_ends_at: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("id", parentId);
          break;
        }

        const agencyId =
          session.client_reference_id ||
          (session.metadata?.agency_id as string | undefined);
        if (!agencyId || !session.subscription || !session.customer) break;

        // This checkout is ALWAYS the license subscription as of Batch
        // 22 — seats are never a line item here.
        const licenseSubscription = await getStripe().subscriptions.retrieve(
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id
        );
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer.id;

        await admin
          .from("agencies")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: licenseSubscription.id,
            plan_status: mapSubscriptionStatus(licenseSubscription.status),
            current_period_end: new Date(licenseSubscription.current_period_end * 1000).toISOString(),
          })
          .eq("id", agencyId);

        // If seats were requested alongside the license at signup,
        // create their own separate subscription now, using the payment
        // method this checkout just saved. Guarded so a Stripe webhook
        // retry can't create a second seats subscription — only runs if
        // this agency has no seats subscription and no seat rows yet.
        const { data: agencyAfterLicense } = await admin
          .from("agencies")
          .select("stripe_seats_subscription_id")
          .eq("id", agencyId)
          .maybeSingle();

        const { count: existingSeatCount } = await admin
          .from("seats")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", agencyId);

        if (!agencyAfterLicense?.stripe_seats_subscription_id && (!existingSeatCount || existingSeatCount === 0)) {
          const standardSeats = Number(session.metadata?.requested_standard_seats || 0);
          const premiumSeats = Number(session.metadata?.requested_premium_seats || 0);
          const cycleEndYearRaw = session.metadata?.admission_cycle_end_year;
          const cycleEndYear = cycleEndYearRaw ? Number(cycleEndYearRaw) : null;

          if (standardSeats > 0 || premiumSeats > 0) {
            await createSeatsSubscription(
              admin,
              agencyId,
              customerId,
              standardSeats,
              premiumSeats,
              cycleEndYear
            );
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        // Batch 27: parent accounts checked first — a customer is
        // either an agency or a parent, never both, so this is a safe
        // short-circuit rather than something that needs metadata.kind
        // to disambiguate (unlike the license-vs-seats check below,
        // which both belong to the same agency customer).
        const parentAccount = await findParentAccountForCustomer(admin, customerId);
        if (parentAccount) {
          const newStatus = mapParentSubscriptionStatus(subscription.status);
          const wasStillInTrial = parentAccount.plan_status === "trialing";

          if (wasStillInTrial && (newStatus === "canceled" || subscription.status === "canceled")) {
            // Exactly the scenario Dan specified: canceled before the
            // trial ever converted to a real payment. Irreversible.
            await wipeParentAccount(admin, parentAccount.id);
          } else {
            await admin
              .from("parent_accounts")
              .update({
                plan_status: newStatus,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              })
              .eq("id", parentAccount.id);
          }
          break;
        }

        // Batch 22: this event could be for EITHER the license or the
        // seats subscription — they're two separate Subscription
        // objects now. Metadata.kind (set when each was created) is the
        // fast path; falling back to matching against the agency's
        // stored subscription IDs covers events from before this batch
        // or any edge case where metadata didn't come through.
        const kindHint = subscription.metadata?.kind as "license" | "seats" | undefined;
        const agency = await findAgencyForCustomer(admin, customerId);
        if (!agency) break;

        const isLicense =
          kindHint === "license" || agency.stripe_subscription_id === subscription.id;
        const isSeats =
          kindHint === "seats" || agency.stripe_seats_subscription_id === subscription.id;

        if (isLicense) {
          await admin
            .from("agencies")
            .update({
              stripe_subscription_id: subscription.id,
              plan_status: mapSubscriptionStatus(subscription.status),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("id", agency.id);
        } else if (isSeats) {
          const { standard_seats, premium_seats } = seatCountsFromSubscription(subscription);
          await admin
            .from("agencies")
            .update({
              stripe_seats_subscription_id: subscription.id,
              seats_plan_status: mapSubscriptionStatus(subscription.status),
              seats_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              standard_seats,
              premium_seats,
            })
            .eq("id", agency.id);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;

        const agency = await findAgencyForCustomer(admin, customerId);
        if (!agency) break;

        await admin.from("billing_events").upsert(
          {
            agency_id: agency.id,
            stripe_event_id: event.id,
            type: event.type,
            amount_total: invoice.amount_paid,
            currency: invoice.currency,
            status: invoice.status,
            hosted_invoice_url: invoice.hosted_invoice_url,
          },
          { onConflict: "stripe_event_id" }
        );
        break;
      }

      default:
        // Other event types are ignored — add cases above as new billing
        // features need them.
        break;
    }
  } catch (err) {
    console.error(`Stripe webhook handler failed for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
