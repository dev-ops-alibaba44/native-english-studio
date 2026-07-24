import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StageThread } from "@/components/StageThread";
import { STAGE_ORDER, STAGE_LABELS, type Stage } from "@/lib/stages";
import { addComment, updateStage } from "./actions";

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

const ERROR_MESSAGES: Record<string, string> = {
  comment_failed: "無法送出回饋，請稍後再試。",
  stage_failed: "無法更新階段，請稍後再試。",
};

export default async function AdvisorApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, prompt_text, word_limit, deadline, stage, schools(name), profiles(display_name)")
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
  const addCommentForThisDraft = latestDraft
    ? addComment.bind(null, id, latestDraft.id)
    : null;
  const updateStageForThisApplication = updateStage.bind(null, id);

  return (
    <div>
      <Link href="/advisor/students" className="text-xs text-slate mb-3 inline-block">
        ← 回到學生總覽
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">
        {app.schools?.name} <span className="text-base font-normal text-slate">— {app.profiles?.display_name}</span>
      </h1>
      <p className="text-sm text-slate mb-1">{app.prompt_text || "（尚未填寫文書題目）"}</p>
      <p className="text-xs text-slate mb-6">
        {app.word_limit ? `${app.word_limit} 字上限 · ` : ""}
        {app.deadline ? `截止日 ${app.deadline}` : "尚未設定截止日"}
      </p>

      {error && (
        <div className="rounded border border-danger/30 bg-danger-tint text-danger text-sm px-4 py-3 mb-6">
          {ERROR_MESSAGES[error] || "發生錯誤，請稍後再試。"}
        </div>
      )}

      <div className="mb-6">
        <StageThread stage={app.stage as Stage} />
      </div>

      <div className="rounded border border-line bg-surface shadow-card p-4 mb-8 flex items-center gap-3">
        <span className="text-sm font-medium">更新階段：</span>
        <form action={updateStageForThisApplication} className="flex items-center gap-2">
          <select
            name="stage"
            defaultValue={app.stage}
            className="rounded border border-line px-2 py-1.5 text-sm"
          >
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white">
            更新
          </button>
        </form>
      </div>

      <h3 className="font-display font-bold text-base mb-2">草稿歷程</h3>
      <div className="rounded border border-line bg-surface shadow-card divide-y divide-line mb-8">
        {!drafts || drafts.length === 0 ? (
          <p className="p-4 text-sm text-slate">學生尚未上傳任何草稿。</p>
        ) : (
          drafts.map((d, i) => {
            const wc = wordCount(d.content);
            const prevWc = drafts[i + 1] ? wordCount(drafts[i + 1].content) : null;
            const delta = prevWc !== null ? wc - prevWc : null;
            return (
              <div key={d.id} className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold">第 {d.version} 版</span>
                  <span className="text-xs text-slate ml-2">
                    {new Date(d.created_at).toLocaleString("zh-TW")}
                  </span>
                </div>
                <div className="text-xs text-slate">
                  {wc} 字
                  {delta !== null && (
                    <span className={delta >= 0 ? "text-good ml-1" : "text-danger ml-1"}>
                      （{delta >= 0 ? "+" : ""}
                      {delta}）
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {latestDraft && (
        <>
          <h3 className="font-display font-bold text-base mb-2">
            最新草稿內容（第 {latestDraft.version} 版）
          </h3>
          <div className="rounded border border-line bg-surface shadow-card p-4 text-sm leading-relaxed mb-8 whitespace-pre-wrap">
            {latestDraft.content || "（空白）"}
          </div>
        </>
      )}

      <h3 className="font-display font-bold text-base mb-2">顧問回饋</h3>
      <div className="rounded border border-line bg-surface shadow-card divide-y divide-line mb-4">
        {!comments || comments.length === 0 ? (
          <p className="p-4 text-sm text-slate">尚無回饋。</p>
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

      {addCommentForThisDraft ? (
        <form action={addCommentForThisDraft} className="rounded border border-line bg-surface shadow-card p-4">
          <label className="block text-xs font-medium text-slate mb-1">
            針對哪一句話（選填）
          </label>
          <input
            name="anchor_text"
            className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand mb-3"
            placeholder="例如：第一段的開頭"
          />
          <label className="block text-xs font-medium text-slate mb-1">回饋內容</label>
          <textarea
            name="body"
            required
            rows={3}
            className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand mb-3"
            placeholder="寫下你的建議……"
          />
          <button type="submit" className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white">
            送出回饋
          </button>
        </form>
      ) : (
        <p className="text-sm text-slate">學生上傳草稿後即可留下回饋。</p>
      )}
    </div>
  );
}
