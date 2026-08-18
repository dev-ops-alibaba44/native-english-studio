"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getStripe,
  STRIPE_PRICE_SEAT_STANDARD,
  STRIPE_PRICE_SEAT_PREMIUM,
} from "@/lib/stripe";
import { admissionCycleExpiry, mapSubscriptionStatus } from "@/lib/seats";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function requireAgencyAdminWithSubscription() {
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
    throw new Error("Only an agency admin can manage seats.");
  }

  const { data: agency } = await supabase
    .from("agencies")
    .select("id, stripe_customer_id, stripe_subscription_id, stripe_seats_subscription_id")
    .eq("id", profile.agency_id)
    .single();

  // The LICENSE subscription is required — you can't buy seats without
  // an active license. The SEATS subscription may not exist yet (an
  // agency that bought only the license so far); addSeats() creates it
  // on first use, everything else requires it already exists.
  if (!agency?.stripe_customer_id || !agency?.stripe_subscription_id) {
    redirect("/agency/billing?error=no_subscription_yet");
  }

  return {
    agencyId: profile.agency_id,
    customerId: agency!.stripe_customer_id!,
    seatsSubscriptionId: agency!.stripe_seats_subscription_id as string | null,
  };
}

// Finds the subscription item for a given price, or null if that price
// isn't on the subscription yet (e.g. an agency that never bought a
// premium seat before now).
async function findSubscriptionItem(subscriptionId: string, priceId: string) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  return subscription.items.data.find((item) => {
    const id = typeof item.price === "string" ? item.price : item.price?.id;
    return id === priceId;
  });
}

// Batch 22: the seats subscription is a completely separate Stripe
// Subscription object from the license, so it renews and can be
// canceled independently — this is what fixes Stripe's cancellation
// screen showing one combined total instead of the license's $2,000
// alone. Created lazily on an agency's first seat purchase (whether
// that's at initial signup via the webhook, or later via addSeats if
// the agency bought only the license at first).

// ---------------------------------------------------------------------
// Add seats — the ONLY quantity-increasing path. No decrease is ever
// exposed anywhere in the UI; this is intentional, per Dan.
// ---------------------------------------------------------------------
export async function addSeats(formData: FormData) {
  const { agencyId, customerId, seatsSubscriptionId } = await requireAgencyAdminWithSubscription();
  const admin = createAdminClient();

  const standardToAdd = Math.max(0, Math.floor(Number(formData.get("standard_to_add") || 0)));
  const premiumToAdd = Math.max(0, Math.floor(Number(formData.get("premium_to_add") || 0)));

  // Batch 20: every seat now needs to know which admission cycle it's
  // for, so its expiry can be pinned to the real August 31 boundary
  // instead of "365 days from whenever this was bought." One cycle
  // applies to everything added in a single submission — if an agency
  // needs different cycles for different seats, they add seats in
  // separate submissions.
  const cycleEndYear = Math.floor(Number(formData.get("admission_cycle_end_year") || 0));
  const currentYear = new Date().getFullYear();
  if (!cycleEndYear || cycleEndYear < currentYear || cycleEndYear > currentYear + 6) {
    redirect("/agency/billing?error=invalid_admission_cycle");
  }
  const expiresAt = admissionCycleExpiry(cycleEndYear).toISOString();

  if (standardToAdd === 0 && premiumToAdd === 0) {
    redirect("/agency/billing?error=nothing_to_add");
  }
  if ((standardToAdd > 0 && !STRIPE_PRICE_SEAT_STANDARD) || (premiumToAdd > 0 && !STRIPE_PRICE_SEAT_PREMIUM)) {
    redirect("/agency/billing?error=stripe_not_configured");
  }

  // Two cases: the agency's seats subscription doesn't exist yet (first
  // seat purchase, possibly bought well after the license) — create it
  // fresh with these items, getting its own independent 7-day trial. Or
  // it already exists — add to its existing items the same way as
  // before, per price.
  let subscriptionItemIdByType: { standard?: string; premium?: string };

  if (!seatsSubscriptionId) {
    const items: { price: string; quantity: number }[] = [];
    if (standardToAdd > 0) items.push({ price: STRIPE_PRICE_SEAT_STANDARD, quantity: standardToAdd });
    if (premiumToAdd > 0) items.push({ price: STRIPE_PRICE_SEAT_PREMIUM, quantity: premiumToAdd });

    const created = await getStripe().subscriptions.create({
      customer: customerId,
      items,
      trial_period_days: 7,
      metadata: { agency_id: agencyId, kind: "seats" },
    });

    await admin
      .from("agencies")
      .update({
        stripe_seats_subscription_id: created.id,
        seats_plan_status: mapSubscriptionStatus(created.status),
        seats_current_period_end: new Date(created.current_period_end * 1000).toISOString(),
      })
      .eq("id", agencyId);

    subscriptionItemIdByType = {};
    for (const item of created.items.data) {
      const priceId = typeof item.price === "string" ? item.price : item.price?.id;
      if (priceId === STRIPE_PRICE_SEAT_STANDARD) subscriptionItemIdByType.standard = item.id;
      if (priceId === STRIPE_PRICE_SEAT_PREMIUM) subscriptionItemIdByType.premium = item.id;
    }
  } else {
    subscriptionItemIdByType = {};
    const additions: { type: "standard" | "premium"; count: number; priceId: string }[] = [];
    if (standardToAdd > 0) additions.push({ type: "standard", count: standardToAdd, priceId: STRIPE_PRICE_SEAT_STANDARD });
    if (premiumToAdd > 0) additions.push({ type: "premium", count: premiumToAdd, priceId: STRIPE_PRICE_SEAT_PREMIUM });

    for (const { type, count, priceId } of additions) {
      const existingItem = await findSubscriptionItem(seatsSubscriptionId, priceId);
      let subscriptionItemId: string;

      if (existingItem) {
        const updated = await getStripe().subscriptionItems.update(existingItem.id, {
          quantity: (existingItem.quantity || 0) + count,
          proration_behavior: "create_prorations",
        });
        subscriptionItemId = updated.id;
      } else {
        const created = await getStripe().subscriptionItems.create({
          subscription: seatsSubscriptionId,
          price: priceId,
          quantity: count,
          proration_behavior: "create_prorations",
        });
        subscriptionItemId = created.id;
      }
      subscriptionItemIdByType[type] = subscriptionItemId;
    }
  }

  const newSeatRows: {
    agency_id: string;
    seat_type: "standard" | "premium";
    status: "unused";
    stripe_subscription_item_id: string | undefined;
    admission_cycle_end_year: number;
    expires_at: string;
  }[] = [];
  if (standardToAdd > 0) {
    for (let i = 0; i < standardToAdd; i++) {
      newSeatRows.push({
        agency_id: agencyId,
        seat_type: "standard",
        status: "unused",
        stripe_subscription_item_id: subscriptionItemIdByType.standard,
        admission_cycle_end_year: cycleEndYear,
        expires_at: expiresAt,
      });
    }
  }
  if (premiumToAdd > 0) {
    for (let i = 0; i < premiumToAdd; i++) {
      newSeatRows.push({
        agency_id: agencyId,
        seat_type: "premium",
        status: "unused",
        stripe_subscription_item_id: subscriptionItemIdByType.premium,
        admission_cycle_end_year: cycleEndYear,
        expires_at: expiresAt,
      });
    }
  }
  await admin.from("seats").insert(newSeatRows);

  revalidatePath("/agency/billing");
  redirect("/agency/billing?seat_action=added");
}

// ---------------------------------------------------------------------
// Set (or correct) the admission cycle on a seat that doesn't have one
// yet — legacy seats from before Batch 20, still running on the old
// purchased_at+365-days expires_at. Only allowed while the seat is
// 'unused', same reasoning as every other "still deciding" window in
// this system: once real work starts, the seat and its cycle are locked
// in together.
// ---------------------------------------------------------------------
export async function setAdmissionCycle(seatId: string, formData: FormData) {
  const { agencyId } = await requireAgencyAdminWithSubscription();
  const admin = createAdminClient();

  const cycleEndYear = Math.floor(Number(formData.get("admission_cycle_end_year") || 0));
  const currentYear = new Date().getFullYear();
  if (!cycleEndYear || cycleEndYear < currentYear || cycleEndYear > currentYear + 6) {
    redirect("/agency/students?error=invalid_admission_cycle");
  }

  const { data: seat } = await admin
    .from("seats")
    .select("id, agency_id, status")
    .eq("id", seatId)
    .maybeSingle();
  if (!seat || seat.agency_id !== agencyId) {
    redirect("/agency/students?error=seat_not_found");
  }
  if (seat!.status !== "unused") {
    redirect("/agency/students?error=seat_not_upgradable");
  }

  await admin
    .from("seats")
    .update({
      admission_cycle_end_year: cycleEndYear,
      expires_at: admissionCycleExpiry(cycleEndYear).toISOString(),
    })
    .eq("id", seatId);

  revalidatePath("/agency/students");
  redirect("/agency/students?seat_action=cycle_set");
}

// ---------------------------------------------------------------------
// Cancel a seat — ONLY allowed within 7 days of purchase AND only if the
// seat has never been used (status still 'unused'). This is the sole
// cancellation path; there is no cancellation after that window, ever.
// ---------------------------------------------------------------------
export async function cancelSeat(seatId: string) {
  const { agencyId } = await requireAgencyAdminWithSubscription();
  const admin = createAdminClient();

  const { data: seat } = await admin
    .from("seats")
    .select("id, agency_id, seat_type, status, purchased_at, stripe_subscription_item_id")
    .eq("id", seatId)
    .maybeSingle();

  if (!seat || seat.agency_id !== agencyId) {
    redirect("/agency/students?error=seat_not_found");
  }
  if (seat!.status !== "unused") {
    redirect("/agency/students?error=seat_not_cancelable");
  }
  const ageMs = Date.now() - new Date(seat!.purchased_at).getTime();
  if (ageMs > SEVEN_DAYS_MS) {
    redirect("/agency/students?error=seat_cancel_window_passed");
  }

  if (seat!.stripe_subscription_item_id) {
    const item = await getStripe().subscriptionItems.retrieve(seat!.stripe_subscription_item_id);
    const newQty = Math.max(0, (item.quantity || 1) - 1);
    if (newQty === 0) {
      await getStripe().subscriptionItems.del(item.id, { proration_behavior: "create_prorations" });
    } else {
      await getStripe().subscriptionItems.update(item.id, {
        quantity: newQty,
        proration_behavior: "create_prorations",
      });
    }
  }

  await admin.from("seats").update({ status: "canceled" }).eq("id", seatId);

  revalidatePath("/agency/students");
  redirect("/agency/students?seat_action=canceled");
}

// ---------------------------------------------------------------------
// Upgrade standard -> premium. Allowed regardless of use (Dan confirmed:
// "any standard seat, used or not, can upgrade anytime"). Downgrade is
// never exposed as an action anywhere in the app.
// ---------------------------------------------------------------------
export async function upgradeSeat(seatId: string) {
  const { agencyId, seatsSubscriptionId } = await requireAgencyAdminWithSubscription();
  const admin = createAdminClient();

  const { data: seat } = await admin
    .from("seats")
    .select("id, agency_id, seat_type, status, stripe_subscription_item_id")
    .eq("id", seatId)
    .maybeSingle();

  if (!seat || seat.agency_id !== agencyId) {
    redirect("/agency/students?error=seat_not_found");
  }
  if (seat!.seat_type !== "standard") {
    redirect("/agency/students?error=already_premium");
  }
  if (seat!.status === "archived" || seat!.status === "canceled" || seat!.status === "expired") {
    redirect("/agency/students?error=seat_not_upgradable");
  }
  if (!STRIPE_PRICE_SEAT_PREMIUM) {
    redirect("/agency/students?error=stripe_not_configured");
  }
  if (!seatsSubscriptionId) {
    redirect("/agency/students?error=seat_not_found");
  }

  // Decrement the standard item by one.
  if (seat!.stripe_subscription_item_id) {
    const standardItem = await getStripe().subscriptionItems.retrieve(
      seat!.stripe_subscription_item_id
    );
    const newQty = Math.max(0, (standardItem.quantity || 1) - 1);
    if (newQty === 0) {
      await getStripe().subscriptionItems.del(standardItem.id, {
        proration_behavior: "create_prorations",
      });
    } else {
      await getStripe().subscriptionItems.update(standardItem.id, {
        quantity: newQty,
        proration_behavior: "create_prorations",
      });
    }
  }

  // Increment (or create) the premium item by one.
  const existingPremiumItem = await findSubscriptionItem(seatsSubscriptionId!, STRIPE_PRICE_SEAT_PREMIUM);
  let premiumItemId: string;
  if (existingPremiumItem) {
    const updated = await getStripe().subscriptionItems.update(existingPremiumItem.id, {
      quantity: (existingPremiumItem.quantity || 0) + 1,
      proration_behavior: "create_prorations",
    });
    premiumItemId = updated.id;
  } else {
    const created = await getStripe().subscriptionItems.create({
      subscription: seatsSubscriptionId!,
      price: STRIPE_PRICE_SEAT_PREMIUM,
      quantity: 1,
      proration_behavior: "create_prorations",
    });
    premiumItemId = created.id;
  }

  await admin
    .from("seats")
    .update({
      seat_type: "premium",
      stripe_subscription_item_id: premiumItemId,
      // Batch: upgrading is a deliberate purchase decision — per Dan,
      // once upgraded there's no backing out via the unused/7-day cancel
      // window, even if the seat is technically still untouched and
      // still inside its original 7 days. Forcing status to 'active'
      // here (not just changing seat_type) is what actually removes
      // eligibility, since cancelSeat only allows status === 'unused'.
      status: "active",
    })
    .eq("id", seatId);

  revalidatePath("/agency/students");
  redirect("/agency/students?seat_action=upgraded");
}

// ---------------------------------------------------------------------
// Assign an unused seat to an existing student profile in this agency.
// (A proper invite/account-creation flow is a separate known gap — this
// is the connection point it will eventually call into.)
// ---------------------------------------------------------------------
export async function assignSeat(formData: FormData) {
  const { agencyId } = await requireAgencyAdminWithSubscription();
  const admin = createAdminClient();

  const seatId = formData.get("seat_id") as string;
  const studentId = formData.get("student_id") as string;
  if (!seatId || !studentId) {
    redirect("/agency/students?error=missing_fields");
  }

  const { data: seat } = await admin
    .from("seats")
    .select("id, agency_id, assigned_student_id, status")
    .eq("id", seatId)
    .maybeSingle();
  if (!seat || seat.agency_id !== agencyId || seat.assigned_student_id) {
    redirect("/agency/students?error=seat_unavailable");
  }

  const { data: student } = await admin
    .from("profiles")
    .select("id, agency_id, role")
    .eq("id", studentId)
    .maybeSingle();
  if (!student || student.agency_id !== agencyId || student.role !== "student") {
    redirect("/agency/students?error=student_not_found");
  }

  await admin.from("seats").update({ assigned_student_id: studentId }).eq("id", seatId);

  revalidatePath("/agency/students");
  redirect("/agency/students?success=1");
}

// ---------------------------------------------------------------------
// Archive a student. Never a delete. The seat does NOT free up — per
// Dan's explicit instruction, if the agency wants to work with a
// different student, they buy a new seat.
// ---------------------------------------------------------------------
export async function archiveStudent(studentId: string) {
  const { agencyId } = await requireAgencyAdminWithSubscription();
  const admin = createAdminClient();

  const { data: student } = await admin
    .from("profiles")
    .select("id, agency_id, role")
    .eq("id", studentId)
    .maybeSingle();
  if (!student || student.agency_id !== agencyId || student.role !== "student") {
    redirect("/agency/students?error=student_not_found");
  }

  await admin
    .from("profiles")
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq("id", studentId);

  await admin
    .from("seats")
    .update({ status: "archived" })
    .eq("assigned_student_id", studentId);

  revalidatePath("/agency/students");
  redirect("/agency/students?success=archived");
}
