"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function updateCapacity(advisorId: string, formData: FormData) {
  const raw = formData.get("capacity");
  const capacity = Number(raw);

  if (!raw || !Number.isFinite(capacity) || capacity <= 0) {
    redirect("/agency/capacity?error=capacity_invalid");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS (supabase/batch7_agency_admin_capacity.sql) scopes this update to
  // agency_admin accounts, restricted to advisors in their own agency.
  const { error } = await supabase
    .from("profiles")
    .update({ capacity: Math.round(capacity) })
    .eq("id", advisorId)
    .eq("role", "advisor");

  if (error) {
    console.error("updateCapacity failed:", error);
    redirect("/agency/capacity?error=capacity_failed");
  }

  revalidatePath("/agency/capacity");
  revalidatePath("/agency");
}
