"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function saveSnapshot(
  applicationId: string,
  returnPath: string,
  formData: FormData
) {
  const content = (formData.get("content") as string) || "";
  const contentJsonRaw = formData.get("content_json") as string | null;
  let content_json: unknown = null;
  if (contentJsonRaw) {
    try {
      content_json = JSON.parse(contentJsonRaw);
    } catch {
      content_json = null;
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: latest } = await supabase
    .from("drafts")
    .select("version")
    .eq("application_id", applicationId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version ?? 0) + 1;

  const { error } = await supabase.from("drafts").insert({
    application_id: applicationId,
    author_id: user.id,
    content,
    content_json,
    version: nextVersion,
  });

  if (error) {
    console.error("saveSnapshot failed:", error);
    redirect(`${returnPath}?error=snapshot_failed`);
  }

  revalidatePath(returnPath);
}
