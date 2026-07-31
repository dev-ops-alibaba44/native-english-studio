"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function addComment(
  applicationId: string,
  draftId: string,
  formData: FormData
) {
  const kindRaw = (formData.get("kind") as string) || "comment";
  const kind = kindRaw === "highlight" ? "highlight" : "comment";
  const body = ((formData.get("body") as string) || "").trim();
  const anchorText = ((formData.get("anchor_text") as string) || "").trim() || null;
  const rangeFromRaw = formData.get("range_from") as string | null;
  const rangeToRaw = formData.get("range_to") as string | null;
  const range_from = rangeFromRaw ? Number(rangeFromRaw) : null;
  const range_to = rangeToRaw ? Number(rangeToRaw) : null;

  if (kind === "comment" && !body) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("comments").insert({
    draft_id: draftId,
    author_id: user.id,
    anchor_text: anchorText,
    range_from,
    range_to,
    kind,
    body,
  });

  if (error) {
    console.error("addComment (agency) failed:", error);
    redirect(`/agency/applications/${applicationId}?error=comment_failed`);
  }

  revalidatePath(`/agency/applications/${applicationId}`);
}
