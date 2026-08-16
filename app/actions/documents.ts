"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertSeatActive, SeatInactiveError } from "@/lib/seats";

export interface SavedSnapshot {
  id: string;
  content: string;
  version: number;
  created_at: string;
}

// Called directly from a client onClick (not a <form action>), so it
// always returns a result object rather than ever calling redirect() —
// a thrown redirect from a plain function call like this has no reliable
// place to send the browser, and previously left the "no user" case
// throwing straight into the caller's catch block. Returning the new
// snapshot row lets the client update the "最後儲存於" timestamp and the
// 版本歷史 list from this response directly, instead of depending on
// router.refresh()/revalidatePath() timing to re-deliver fresh data —
// that round trip is what was leaving both stuck on stale values until a
// manual reload.
export async function saveSnapshot(
  applicationId: string,
  returnPath: string,
  formData: FormData
): Promise<{ success: true; snapshot: SavedSnapshot } | { success: false; error: string }> {
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
  if (!user) return { success: false, error: "not_signed_in" };

  const { data: application } = await supabase
    .from("applications")
    .select("id, student_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) return { success: false, error: "not_authorized" };

  try {
    await assertSeatActive(application.student_id);
  } catch (err) {
    if (err instanceof SeatInactiveError) return { success: false, error: err.code };
    throw err;
  }

  const { data: latest } = await supabase
    .from("drafts")
    .select("version")
    .eq("application_id", applicationId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version ?? 0) + 1;

  const { data: inserted, error } = await supabase
    .from("drafts")
    .insert({
      application_id: applicationId,
      author_id: user.id,
      content,
      content_json,
      version: nextVersion,
    })
    .select("id, content, version, created_at")
    .single();

  if (error || !inserted) {
    console.error("saveSnapshot failed:", error);
    return { success: false, error: "snapshot_failed" };
  }

  // Still revalidate so anyone who *does* hit reload (or navigates back to
  // this page later) gets fresh server-rendered data too — this just no
  // longer being the only path to an updated UI for the person who saved.
  revalidatePath(returnPath);

  return { success: true, snapshot: inserted };
}
