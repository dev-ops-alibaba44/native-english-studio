import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, STRIPE_PRICE_SEAT_STANDARD, STRIPE_PRICE_SEAT_PREMIUM } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { admissionCycleExpiry } from "@/lib/seats";

// Stripe requires the raw request body (unparsed) to verify the signature,
// so this route must NOT run any body-parsing middleware. App Router route
// handlers don't parse the body automatically, so req.text() below is safe.
export const runtime = "nodejs";

function mapSubscriptionStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    default:
      // canceled, incomplete, incomplete_expired, paused
      return "canceled";
  }
}

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

async function findAgencyIdForCustomer(
  admin: ReturnType<typeof createAdminClient>,
  customerId: string
): Promise<string | null> {
  const { data } = await admin
    .from("agencies")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.id ?? null;
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
        const agencyId =
          session.client_reference_id ||
          (session.metadata?.agency_id as string | undefined);
        if (!agencyId || !session.subscription || !session.customer) break;

        const subscription = await getStripe().subscriptions.retrieve(
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id
        );
        const { standard_seats, premium_seats } = seatCountsFromSubscription(subscription);

        await admin
          .from("agencies")
          .update({
            stripe_customer_id:
              typeof session.customer === "string" ? session.customer : session.customer.id,
            stripe_subscription_id: subscription.id,
            plan_status: mapSubscriptionStatus(subscription.status),
            standard_seats,
            premium_seats,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("id", agencyId);

        // Batch 18: create the individual seat rows behind these counts,
        // one per unit purchased — only on an agency's FIRST subscription
        // (checked via the seats table being empty), since every seat
        // added after this point goes through app/actions/seats.ts's
        // addSeats(), which inserts its own rows at the time of purchase.
        // Guards against double-inserting rows if Stripe retries this
        // webhook event.
        const { count: existingSeatCount } = await admin
          .from("seats")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", agencyId);

        if (!existingSeatCount || existingSeatCount === 0) {
          const cycleEndYearRaw = session.metadata?.admission_cycle_end_year;
          const cycleEndYear = cycleEndYearRaw ? Number(cycleEndYearRaw) : null;
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
          for (const item of subscription.items.data) {
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
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const agencyId =
          (subscription.metadata?.agency_id as string | undefined) ||
          (await findAgencyIdForCustomer(
            admin,
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id
          ));
        if (!agencyId) break;

        const { standard_seats, premium_seats } = seatCountsFromSubscription(subscription);

        await admin
          .from("agencies")
          .update({
            stripe_subscription_id: subscription.id,
            plan_status: mapSubscriptionStatus(subscription.status),
            standard_seats,
            premium_seats,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("id", agencyId);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;

        const agencyId = await findAgencyIdForCustomer(admin, customerId);
        if (!agencyId) break;

        await admin.from("billing_events").upsert(
          {
            agency_id: agencyId,
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
