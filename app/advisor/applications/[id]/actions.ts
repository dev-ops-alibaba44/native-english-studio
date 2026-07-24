"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function addComment(
  applicationId: string,
  draftId: string,
  formData: FormData
) {
  const body = ((formData.get("body") as string) || "").trim();
  const anchorText = ((formData.get("anchor_text") as string) || "").trim() || null;

  if (!body) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("comments").insert({
    draft_id: draftId,
    author_id: user.id,
    anchor_text: anchorText,
    body,
  });

  if (error) {
    console.error("addComment failed:", error);
    redirect(`/advisor/applications/${applicationId}?error=comment_failed`);
  }

  revalidatePath(`/advisor/applications/${applicationId}`);
}

export async function updateStage(applicationId: string, formData: FormData) {
  const stage = formData.get("stage") as string;

  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ stage })
    .eq("id", applicationId);

  if (error) {
    console.error("updateStage failed:", error);
    redirect(`/advisor/applications/${applicationId}?error=stage_failed`);
  }

  revalidatePath(`/advisor/applications/${applicationId}`);
}
