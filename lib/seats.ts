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
  code: "no_seat" | "expired" | "archived" | "canceled" | "license_inactive";
  constructor(
    code: "no_seat" | "expired" | "archived" | "canceled" | "license_inactive",
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

export async function assertSeatActive(studentId: string): Promise<void> {
  const admin = createAdminClient();

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

  // Batch 20: independent of this seat's own status/expiry — if the
  // agency's license itself isn't active, nothing under it is usable.
  // This is what actually closes the "cancel the license, keep coasting
  // on seats bought last cycle" hole: a lapsed license blocks every
  // seat immediately, even one whose own admission-cycle date hasn't
  // arrived yet.
  const { data: agency } = await admin
    .from("agencies")
    .select("plan_status")
    .eq("id", seat.agency_id)
    .maybeSingle();
  if (!agency || agency.plan_status !== "active") {
    throw new SeatInactiveError("license_inactive", SEAT_ERROR_MESSAGES.license_inactive);
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
