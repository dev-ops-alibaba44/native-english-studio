"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function updateStage(applicationId: string, formData: FormData) {
  const stage = formData.get("stage") as string;

  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ stage })
    .eq("id", applicationId);

  if (error) {
    console.error("updateStage (agency) failed:", error);
    redirect(`/agency/applications/${applicationId}?error=stage_failed`);
  }

  revalidatePath(`/agency/applications/${applicationId}`);
}
