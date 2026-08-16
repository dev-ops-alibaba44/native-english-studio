"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Every action here relies on RLS (batch13_super_admin.sql) to actually
// enforce who can do what — using the regular RLS-scoped client, never
// the admin client, same as every other authenticated-user action in
// this app. A non-super_admin/marketing caller hitting these functions
// would simply get "no rows updated" back from Supabase, not a bypass.

const LEAD_TABLES = ["agency_inquiries", "waitlist_signups"] as const;
type LeadTable = (typeof LEAD_TABLES)[number];
const LEAD_STATUSES = ["new", "contacted", "converted", "declined"] as const;

export async function updateLeadStatus(
  table: LeadTable,
  id: string,
  status: (typeof LEAD_STATUSES)[number]
): Promise<{ success: boolean; error?: string }> {
  if (!LEAD_TABLES.includes(table) || !LEAD_STATUSES.includes(status)) {
    return { success: false, error: "invalid_input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from(table).update({ status }).eq("id", id);

  if (error) {
    console.error(`updateLeadStatus: failed on ${table}`, error);
    return { success: false, error: "update_failed" };
  }

  revalidatePath("/super-admin/leads");
  revalidatePath("/marketing/leads");
  return { success: true };
}

export async function updateAgencyBilling(
  agencyId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const planStatus = (formData.get("plan_status") as string) || "active";
  const feeRaw = (formData.get("annual_fee_usd") as string) || "";
  const notes = (formData.get("plan_notes") as string) || "";

  const validStatuses = ["trial", "active", "past_due", "cancelled"];
  if (!validStatuses.includes(planStatus)) {
    return { success: false, error: "invalid_status" };
  }

  const annual_fee_usd = feeRaw.trim() === "" ? null : Number(feeRaw);
  if (annual_fee_usd !== null && !Number.isFinite(annual_fee_usd)) {
    return { success: false, error: "invalid_fee" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("agencies")
    .update({ plan_status: planStatus, annual_fee_usd, plan_notes: notes || null })
    .eq("id", agencyId);

  if (error) {
    console.error("updateAgencyBilling: failed", error);
    return { success: false, error: "update_failed" };
  }

  revalidatePath("/super-admin/agencies");
  revalidatePath(`/super-admin/agencies/${agencyId}`);
  return { success: true };
}
