import { createAdminClient } from "@/lib/supabase/admin";

// Shared enforcement point for the seat lifecycle rules Dan specified:
//   - a seat that's never had any real content created under it is
//     "unused" and can roll into next year (the one and only exception)
//   - the moment any content-creating action happens, the seat becomes
//     "active" and is locked in for the rest of its admission cycle
//   - past expires_at (or archived by the agency, or the agency's whole
//     license has lapsed), the student becomes read-only: no AI feedback,
//     no brainstorming, no new colleges/activities/comments, nothing that
//     creates or changes data
//
// IMPORTANT: this must be called from EVERY server action that creates or
// mutates a student's data — hiding a button in the UI is not
// enforcement, since a request can still hit the server action directly.
// Call `assertSeatActive(studentId)` as the very first thing (after
// confirming the caller's identity/access), before any write happens.
export class SeatInactiveError extends Error {
  code:
    | "no_seat"
    | "expired"
    | "archived"
    | "canceled"
    | "license_inactive"
    | "seats_inactive"
    | "parent_account_inactive";
  constructor(
    code:
      | "no_seat"
      | "expired"
      | "archived"
      | "canceled"
      | "license_inactive"
      | "seats_inactive"
      | "parent_account_inactive",
    message: string
  ) {
    super(message);
    this.code = code;
  }
}

// Shared error labels — spread this into any page's local ERROR_MESSAGES
// map so a blocked action always shows the same clear explanation.
export const SEAT_ERROR_MESSAGES: Record<string, string> = {
  no_seat: "此學生尚未分配席次，請聯絡機構管理者於「帳單與繳費」頁面指派席次。",
  expired: "此席次已到期（入學年度已結束），目前僅能檢視，無法編輯。",
  archived: "此學生帳號已被機構封存，目前僅能檢視，無法編輯。",
  canceled: "此席次已取消，無法使用。",
  license_inactive: "貴機構的授權訂閱目前未生效（已取消或付款逾期），所有學生帳號暫時僅能檢視。請至「帳單與繳費」確認訂閱狀態。",
  seats_inactive: "貴機構的席次訂閱目前未生效（已取消或付款逾期），所有學生帳號暫時僅能檢視。請至「帳單與繳費」確認訂閱狀態。",
  parent_account_inactive: "此帳號的訂閱目前未生效，請完成付款以繼續使用。",
};

// A seat's admission cycle is the year the student STARTS university —
// e.g. a seat for a student applying during the 2026–2027 school year,
// starting university September 2027, has admission_cycle_end_year =
// 2027 and expires August 31, 2027, no matter when the seat itself was
// purchased. This replaced the old flat "365 days from purchase" rule,
// which had a real gaming hole: an agency could buy seats late in a
// cycle and effectively get most of a second cycle for free before the
// 365-day clock ran out. Anchoring to the actual calendar boundary the
// seat is being used for closes that.
export function admissionCycleExpiry(endYear: number): Date {
  // August 31, 23:59:59 local server time — generous enough that a
  // student working late on August 31 doesn't get cut off mid-session.
  return new Date(endYear, 7, 31, 23, 59, 59);
}

// Shared Stripe subscription-status -> our plan_status/seats_plan_status
// mapping, used by both the webhook and any server action that creates a
// subscription directly (e.g. addSeats creating the seats subscription
// on first use). One definition so the two paths can't drift apart.
export function mapSubscriptionStatus(
  status: "active" | "trialing" | "past_due" | "unpaid" | "canceled" | "incomplete" | "incomplete_expired" | "paused"
): "active" | "past_due" | "canceled" {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    default:
      return "canceled";
  }
}

// Batch 27: parent_accounts needs a SEPARATE mapping that does NOT
// collapse "trialing" into "active" the way mapSubscriptionStatus does
// above — the whole trial-cancellation data-wipe mechanic (and the AI
// usage cap during trial) depends on being able to tell "actually
// converted to a paying customer" apart from "still in the trial
// window," which mapSubscriptionStatus's agency-oriented behavior would
// silently erase.
export function mapParentSubscriptionStatus(
  status: "active" | "trialing" | "past_due" | "unpaid" | "canceled" | "incomplete" | "incomplete_expired" | "paused"
): "active" | "trialing" | "past_due" | "canceled" {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    default:
      return "canceled";
  }
}

// The canonical way to get a seat's real expiry. Prefer deriving it live
// from admission_cycle_end_year over trusting the separately-stored
// expires_at column — a stored value can only ever be as correct as
// whatever write path last touched it, and Dan found a real case where
// it drifted out of sync with the cycle that was actually set. Deriving
// it fresh here means that class of bug can't recur even if some future
// write path forgets to also update expires_at: the cycle is the single
// source of truth once one exists. expires_at only matters as a fallback
// for legacy seats that predate admission cycles entirely.
export function effectiveExpiresAt(seat: {
  expires_at: string;
  admission_cycle_end_year: number | null;
}): Date {
  if (seat.admission_cycle_end_year) {
    return admissionCycleExpiry(seat.admission_cycle_end_year);
  }
  return new Date(seat.expires_at);
}

// Shared with any page that needs to offer an admission-cycle picker
// (the billing page's initial-checkout/add-seats forms, and now the
// per-seat "set cycle" control that lives on the students page as of
// Batch 23) — one definition so the list of offered years can't drift
// between the two.
export function admissionCycleOptions(): { value: number; label: string }[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }).map((_, i) => {
    const endYear = currentYear + i;
    return { value: endYear, label: `${endYear - 1}–${endYear}（${endYear} 年 9 月入學）` };
  });
}

// Shared with any page showing a seat's remaining cancel-window — moved
// here in Batch 23 when seat-level actions moved from the billing page
// onto the students page, so both (and the upgrade confirmation page)
// agree on the same math.
export function daysLeftToCancel(purchasedAt: string): number {
  const ageMs = Date.now() - new Date(purchasedAt).getTime();
  const daysLeft = 7 - Math.floor(ageMs / (24 * 60 * 60 * 1000));
  return Math.max(0, daysLeft);
}

export const SEAT_STATUS_LABEL: Record<string, string> = {
  unused: "尚未使用",
  active: "使用中",
  archived: "已封存",
  expired: "已到期",
  canceled: "已取消",
};
export const SEAT_STATUS_PILL: Record<string, string> = {
  unused: "bg-slate-light text-slate",
  active: "bg-good-tint text-good",
  archived: "bg-slate-light text-slate line-through",
  expired: "bg-danger-tint text-danger",
  canceled: "bg-slate-light text-slate line-through",
};

// Batch 24: agencies with several unassigned seats of the same type/
// cycle had no way to tell them apart in either the students-page list
// or the sign-up form's dropdown — every option looked identical. This
// numbers each seat within its own type group (Standard #1, #2, …;
// Premium #1, #2, … separately), computed fresh at render time from
// purchase order (oldest first) rather than stored anywhere, so it stays
// correct automatically as seats are added, assigned, or canceled — a
// canceled "Standard #2" just means the next render numbers what used
// to be "#3" as "#2", no stale numbers left behind.
export function numberSeatsByType<T extends { id: string; seat_type: string; purchased_at: string }>(
  seats: T[]
): Map<string, number> {
  const numberById = new Map<string, number>();
  const sorted = [...seats].sort(
    (a, b) => new Date(a.purchased_at).getTime() - new Date(b.purchased_at).getTime()
  );
  const counters: Record<string, number> = {};
  for (const seat of sorted) {
    counters[seat.seat_type] = (counters[seat.seat_type] || 0) + 1;
    numberById.set(seat.id, counters[seat.seat_type]);
  }
  return numberById;
}

export async function assertSeatActive(studentId: string): Promise<void> {
  const admin = createAdminClient();

  // Batch 27: a parent-linked student (profiles.parent_id set) has no
  // agency `seats` row at all — this branch checks the parent's own
  // subscription status instead, then returns. Both "trialing" and
  // "active" plan_status are usable; everything else (inactive,
  // past_due, canceled) blocks writes the same way an inactive agency
  // license does.
  const { data: studentProfile } = await admin
    .from("profiles")
    .select("parent_id")
    .eq("id", studentId)
    .maybeSingle();

  if (studentProfile?.parent_id) {
    let { data: parentAccount } = await admin
      .from("parent_accounts")
      .select("plan_status")
      .eq("id", studentProfile.parent_id)
      .maybeSingle();

    if (!parentAccount || !["trialing", "active"].includes(parentAccount.plan_status)) {
      // Batch 28: don't fail closed on the first check alone — the
      // stored plan_status only ever gets updated by the Stripe webhook
      // or by the parent loading their own /parent or /parent/billing
      // page (see lib/parent-billing.ts). A student can easily act
      // before either of those has happened even though the parent's
      // payment genuinely went through. One live reconcile attempt here
      // means a student isn't blocked just because their parent hasn't
      // looked at the app since checking out.
      const { syncParentAccountFromStripe } = await import("@/lib/parent-billing");
      await syncParentAccountFromStripe(studentProfile.parent_id);
      const { data: refreshed } = await admin
        .from("parent_accounts")
        .select("plan_status")
        .eq("id", studentProfile.parent_id)
        .maybeSingle();
      parentAccount = refreshed;
    }

    if (!parentAccount || !["trialing", "active"].includes(parentAccount.plan_status)) {
      throw new SeatInactiveError("parent_account_inactive", SEAT_ERROR_MESSAGES.parent_account_inactive);
    }
    return;
  }

  const { data: seat } = await admin
    .from("seats")
    .select("id, agency_id, status, expires_at, admission_cycle_end_year")
    .eq("assigned_student_id", studentId)
    .maybeSingle();

  if (!seat) {
    // No seat row at all — either a legacy account from before Batch 18,
    // or never properly assigned. Fail closed: no seat, no writes.
    throw new SeatInactiveError(
      "no_seat",
      "此學生尚未分配席次，請聯絡機構管理者於「帳單與繳費」頁面指派席次。"
    );
  }

  // Batch 20/22: independent of this seat's own status/expiry — if EITHER
  // the agency's license subscription or its seats subscription isn't
  // active, nothing under it is usable. Two separate Stripe subscriptions
  // as of Batch 22 (license and seats renew and cancel independently),
  // so both need their own check: canceling just the seats subscription
  // (keeping the license) must lock out every seat exactly the same as
  // canceling the license does.
  const { data: agency } = await admin
    .from("agencies")
    .select("plan_status, seats_plan_status")
    .eq("id", seat.agency_id)
    .maybeSingle();
  if (!agency || agency.plan_status !== "active") {
    throw new SeatInactiveError("license_inactive", SEAT_ERROR_MESSAGES.license_inactive);
  }
  if (agency.seats_plan_status !== "active") {
    throw new SeatInactiveError("seats_inactive", SEAT_ERROR_MESSAGES.seats_inactive);
  }

  if (seat.status === "archived") {
    throw new SeatInactiveError("archived", SEAT_ERROR_MESSAGES.archived);
  }
  if (seat.status === "canceled") {
    throw new SeatInactiveError("canceled", SEAT_ERROR_MESSAGES.canceled);
  }

  const isPastExpiry = effectiveExpiresAt(seat).getTime() <= Date.now();
  if (isPastExpiry) {
    if (seat.status !== "expired") {
      await admin.from("seats").update({ status: "expired" }).eq("id", seat.id);
    }
    throw new SeatInactiveError("expired", SEAT_ERROR_MESSAGES.expired);
  }

  if (seat.status === "unused") {
    // First real content-creating action under this seat — lock it in as
    // active. From this point on it is no longer eligible to roll into
    // next cycle; expires_at keeps running toward its admission-cycle
    // date regardless (never reset by later activity).
    await admin.from("seats").update({ status: "active" }).eq("id", seat.id);
  }
}
