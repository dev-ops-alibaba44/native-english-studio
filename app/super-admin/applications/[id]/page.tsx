import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StageThread } from "@/components/StageThread";
import type { Stage } from "@/lib/stages";

export default async function SuperAdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, prompt_text, word_limit, deadline, stage, student_id, schools(name), profiles(display_name)")
    .eq("id", id)
    .single();

  if (!application) {
    return <p className="text-sm text-danger">找不到這個申請項目。</p>;
  }

  const app = application as unknown as {
    id: string;
    prompt_text: string;
    word_limit: number | null;
    deadline: string | null;
    stage: Stage;
    student_id: string;
    schools?: { name?: string };
    profiles?: { display_name?: string };
  };

  const { data: latestDraft } = await supabase
    .from("drafts")
    .select("id, content, version, created_at")
    .eq("application_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: comments } = latestDraft
    ? await supabase
        .from("comments")
        .select("id, anchor_text, body, resolved, created_at, profiles(display_name)")
        .eq("draft_id", latestDraft.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div>
      <Link
        href={`/super-admin/students/${app.student_id}`}
        className="text-xs text-brand hover:underline"
      >
        ← 回到 {app.profiles?.display_name ?? "學生"} 的申請列表
      </Link>

      <div className="mt-2 rounded border border-warn/30 bg-warn-tint px-4 py-2 text-xs text-warn">
        唯讀檢視 — 這是最後一次儲存的版本，無法在此編輯或留言。
      </div>

      <h1 className="mt-4 font-display text-2xl font-bold text-ink">{app.schools?.name}</h1>
      <p className="mt-1 text-sm text-slate">{app.prompt_text || "（尚未填寫文書題目）"}</p>
      <p className="mt-1 text-xs text-slate">
        {app.word_limit ? `${app.word_limit} 字上限 · ` : ""}
        {app.deadline ? `截止日 ${app.deadline}` : "尚未設定截止日"}
      </p>

      <div className="mt-6">
        <StageThread stage={app.stage} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded border border-line bg-surface p-5 shadow-card">
          {latestDraft ? (
            <>
              <p className="mb-3 text-xs text-slate">
                最後儲存版本 v{latestDraft.version} —{" "}
                {new Date(latestDraft.created_at).toLocaleString("zh-TW")}
              </p>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {latestDraft.content || "（尚無內容）"}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate">這個申請項目還沒有儲存過任何版本。</p>
          )}
        </div>

        <div>
          <h2 className="font-display text-sm font-bold text-ink">評論</h2>
          <div className="mt-3 space-y-3">
            {(comments ?? []).map((c) => {
              const author = (c as unknown as { profiles?: { display_name?: string } }).profiles;
              return (
                <div key={c.id} className="rounded border border-line bg-surface p-3 text-sm">
                  <div className="flex items-center justify-between text-xs text-slate">
                    <span className="font-medium text-ink">
                      {author?.display_name ?? "Anonymous"}
                    </span>
                    <span>{new Date(c.created_at).toLocaleDateString("zh-TW")}</span>
                  </div>
                  {c.anchor_text && (
                    <p className="mt-1 rounded bg-highlight px-1.5 py-0.5 text-xs text-ink">
                      “{c.anchor_text}”
                    </p>
                  )}
                  <p className="mt-1.5 text-ink">{c.body}</p>
                </div>
              );
            })}
            {(comments ?? []).length === 0 && (
              <p className="text-sm text-slate">尚無評論。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
