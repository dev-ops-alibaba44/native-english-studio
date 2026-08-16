import { createAdminClient } from "@/lib/supabase/admin";

// Shared enforcement point for the seat lifecycle rules Dan specified:
//   - a seat that's never had any real content created under it is
//     "unused" and can roll into next year (the one and only exception)
//   - the moment any content-creating action happens for that student,
//     the seat becomes "active" and is locked in for its 365-day period
//   - past expires_at (or archived by the agency), the student becomes
//     read-only: no AI feedback, no brainstorming, no new
//     colleges/activities/comments, nothing that creates or changes data
//
// IMPORTANT: this must be called from EVERY server action that creates or
// mutates a student's data, not just AI-cost-bearing ones — hiding a
// button in the UI is not enforcement, since a request can still hit the
// server action directly. Call `assertSeatActive(studentId)` as the very
// first thing (after confirming the caller's identity/access), before any
// write happens. See app/actions/ai-feedback.ts and app/actions/brainstorm.ts
// for the pattern; other action files still need the same one-line addition
// (tracked in HANDOFF).
export class SeatInactiveError extends Error {
  code: "no_seat" | "expired" | "archived" | "canceled";
  constructor(code: "no_seat" | "expired" | "archived" | "canceled", message: string) {
    super(message);
    this.code = code;
  }
}

// Shared error labels — spread this into any page's local ERROR_MESSAGES
// map (e.g. `{ ...SEAT_ERROR_MESSAGES, ...pageSpecificMessages }`) so a
// blocked action always shows the same clear explanation, wherever it
// happened.
export const SEAT_ERROR_MESSAGES: Record<string, string> = {
  no_seat: "此學生尚未分配席次，請聯絡機構管理者於「帳單與繳費」頁面指派席次。",
  expired: "此席次已到期（購買滿 365 天），目前僅能檢視，無法編輯。",
  archived: "此學生帳號已被機構封存，目前僅能檢視，無法編輯。",
  canceled: "此席次已取消，無法使用。",
};

export async function assertSeatActive(studentId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: seat } = await admin
    .from("seats")
    .select("id, status, expires_at")
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

  if (seat.status === "archived") {
    throw new SeatInactiveError("archived", "此學生帳號已被機構封存，目前僅能檢視，無法編輯。");
  }
  if (seat.status === "canceled") {
    throw new SeatInactiveError("canceled", "此席次已取消，無法使用。");
  }

  const isPastExpiry = new Date(seat.expires_at).getTime() <= Date.now();
  if (isPastExpiry) {
    if (seat.status !== "expired") {
      await admin.from("seats").update({ status: "expired" }).eq("id", seat.id);
    }
    throw new SeatInactiveError("expired", "此席次已到期（購買滿 365 天），目前僅能檢視，無法編輯。");
  }

  if (seat.status === "unused") {
    // First real content-creating action under this seat — lock it in as
    // active. From this point on it is no longer eligible to roll into
    // next year; the 365-day clock keeps running from the ORIGINAL
    // purchase date regardless (confirmed with Dan — never reset).
    await admin.from("seats").update({ status: "active" }).eq("id", seat.id);
  }
}
