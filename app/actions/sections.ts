"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function addSection(
  applicationId: string,
  returnPath: string,
  formData: FormData
) {
  const title = ((formData.get("title") as string) || "").trim();
  const prompt_text = ((formData.get("prompt_text") as string) || "").trim() || null;
  const word_limit_raw = formData.get("word_limit") as string | null;
  const word_limit = word_limit_raw ? Number(word_limit_raw) : null;

  if (!title) {
    redirect(`${returnPath}?error=section_title_required`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: section, error } = await supabase
    .from("application_sections")
    .insert({ application_id: applicationId, title, prompt_text, word_limit })
    .select("id")
    .single();

  if (error || !section) {
    console.error("addSection failed:", error);
    redirect(`${returnPath}?error=section_failed`);
  }

  revalidatePath(returnPath);
  redirect(`${returnPath}?section=${section.id}`);
}
