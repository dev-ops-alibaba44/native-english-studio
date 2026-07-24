import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StageThread } from "@/components/StageThread";
import { STAGE_LABELS, type Stage } from "@/lib/stages";
import { addDraft } from "./actions";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, prompt_text, word_limit, deadline, stage, schools(name)")
    .eq("id", id)
    .single();

  const { data: drafts } = await supabase
    .from("drafts")
    .select("id, content, version, created_at")
    .eq("application_id", id)
    .order("version", { ascending: false });

  const latestDraft = drafts?.[0];

  const { data: comments } = latestDraft
    ? await supabase
        .from("comments")
        .select("id, body, anchor_text, created_at, profiles(display_name)")
        .eq("draft_id", latestDraft.id)
        .order("created_at", { ascending: true })
    : { data: [] as any[] };

  if (!application) {
    return <p className="text-sm text-danger">找不到這個申請項目。</p>;
  }

  const app = application as any;
  const addDraftForThisApplication = addDraft.bind(null, id);

  return (
    <div>
      <Link href="/student/applications" className="text-xs text-slate mb-3 inline-block">
        ← 回到我的申請
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">{app.schools?.name}</h1>
      <p className="text-sm text-slate mb-1">
        {app.prompt_text || "（尚未填寫文書題目）"}
      </p>
      <p className="text-xs text-slate mb-6">
        {app.word_limit ? `${app.word_limit} 字上限 · ` : ""}
        {app.deadline ? `截止日 ${app.deadline}` : "尚未設定截止日"}
      </p>

      <div className="mb-8">
        <StageThread stage={app.stage as Stage} />
        <p className="text-xs text-slate mt-2">
          目前階段：{STAGE_LABELS[app.stage as Stage]}
        </p>
      </div>

      <h3 className="font-display font-bold text-base mb-2">
        目前草稿{latestDraft ? `（第 ${latestDraft.version} 版）` : ""}
      </h3>
      <form action={addDraftForThisApplication} className="mb-8">
        <textarea
          name="content"
          rows={10}
          defaultValue={latestDraft?.content || ""}
          className="w-full rounded border border-line px-4 py-3 text-sm leading-relaxed outline-none focus:border-brand mb-3"
          placeholder="開始寫下你的草稿……"
        />
        <button
          type="submit"
          className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          儲存新版本
        </button>
      </form>

      <h3 className="font-display font-bold text-base mb-2">顧問回饋</h3>
      <div className="rounded border border-line bg-surface shadow-card divide-y divide-line">
        {!comments || comments.length === 0 ? (
          <p className="p-4 text-sm text-slate">
            尚無顧問回饋 — 顧問功能將在下一批次開放。
          </p>
        ) : (
          comments.map((c: any) => (
            <div key={c.id} className="p-4">
              {c.anchor_text && (
                <div className="text-xs italic text-slate mb-1">針對「{c.anchor_text}」</div>
              )}
              <div className="text-xs font-bold text-brand mb-1">
                {c.profiles?.display_name || "顧問"}
              </div>
              <div className="text-sm leading-relaxed">{c.body}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
