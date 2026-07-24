"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function addDraft(applicationId: string, formData: FormData) {
  const content = (formData.get("content") as string) || "";

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

  await supabase.from("drafts").insert({
    application_id: applicationId,
    author_id: user.id,
    content,
    version: nextVersion,
  });

  revalidatePath(`/student/applications/${applicationId}`);
}
