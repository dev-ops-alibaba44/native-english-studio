import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StageThread } from "@/components/StageThread";
import { type Stage } from "@/lib/stages";
import { DraftEditor } from "@/components/editor/DraftEditor";
import { AnnotatedDraft } from "@/components/editor/AnnotatedDraft";
import { LiveRefresh } from "@/components/realtime/LiveRefresh";
import { addComment } from "./actions";

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

const ERROR_MESSAGES: Record<string, string> = {
  comment_failed: "無法送出回饋，請稍後再試。",
};

export default async function AgencyApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; version?: string; compare?: string }>;
}) {
  const { id } = await params;
  const { error, version, compare } = await searchParams;
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, prompt_text, word_limit, deadline, stage, schools(name), profiles(display_name)")
    .eq("id", id)
    .single();

  const { data: drafts } = await supabase
    .from("drafts")
    .select("id, content, content_json, version, created_at")
    .eq("application_id", id)
    .order("version", { ascending: false });

  if (!application) {
    return <p className="text-sm text-danger">找不到這個申請項目。</p>;
  }

  const app = application as any;
  const allDrafts = drafts || [];
  const latestDraft = allDrafts[0];
  const selectedDraft =
    (version && allDrafts.find((d) => String(d.version) === version)) || latestDraft;
  const compareDraft = compare
    ? allDrafts.find((d) => String(d.version) === compare)
    : null;
  const viewingLatest = !version || selectedDraft?.id === latestDraft?.id;

  const { data: comments } = selectedDraft
    ? await supabase
        .from("comments")
        .select("id, body, anchor_text, range_from, range_to, kind, created_at, profiles(display_name)")
        .eq("draft_id", selectedDraft.id)
        .order("created_at", { ascending: true })
    : { data: [] as any[] };

  const addCommentForThisDraft = selectedDraft
    ? addComment.bind(null, id, selectedDraft.id)
    : null;

  const commentsForDisplay = (comments || []).map((c: any) => ({
    id: c.id,
    body: c.body,
    anchor_text: c.anchor_text,
    range_from: c.range_from,
    range_to: c.range_to,
    kind: (c.kind as "comment" | "highlight") || "comment",
    created_at: c.created_at,
    author_display_name: c.profiles?.display_name || "顧問",
  }));

  return (
    <div>
      {selectedDraft && <LiveRefresh applicationId={id} draftId={selectedDraft.id} />}

      <Link href="/agency/students" className="text-xs text-slate mb-3 inline-block">
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

      {!selectedDraft ? (
        <p className="text-sm text-slate">學生尚未上傳任何草稿。</p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-base">
              {viewingLatest ? "最新草稿" : `第 ${selectedDraft.version} 版`}
              <span className="text-xs font-normal text-slate ml-2">
                {new Date(selectedDraft.created_at).toLocaleString("zh-TW")}
              </span>
            </h3>
          </div>

          <div className={compareDraft ? "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4" : "mb-4"}>
            <div>
              <AnnotatedDraft
                key={selectedDraft.id}
                content={(selectedDraft.content_json as any) || selectedDraft.content || ""}
                comments={commentsForDisplay}
                canComment
                onAddComment={addCommentForThisDraft || undefined}
              />
            </div>
            {compareDraft && (
              <div>
                <div className="text-xs font-semibold text-slate mb-2">
                  比較：第 {compareDraft.version} 版（{new Date(compareDraft.created_at).toLocaleDateString("zh-TW")}）
                </div>
                <DraftEditor
                  key={compareDraft.id}
                  content={(compareDraft.content_json as any) || compareDraft.content || ""}
                  editable={false}
                />
              </div>
            )}
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-slate select-none">
              查看所有版本（共 {allDrafts.length} 版）
            </summary>
            <div className="rounded border border-line bg-surface shadow-card divide-y divide-line mt-2">
              {allDrafts.map((d, i) => {
                const wc = wordCount(d.content);
                const prevWc = allDrafts[i + 1] ? wordCount(allDrafts[i + 1].content) : null;
                const delta = prevWc !== null ? wc - prevWc : null;
                const isSelected = selectedDraft?.id === d.id;
                const isCompared = compareDraft?.id === d.id;
                return (
                  <div
                    key={d.id}
                    className={`p-3 flex items-center justify-between ${isSelected ? "bg-brand-tint" : ""}`}
                  >
                    <div>
                      <Link
                        href={`/agency/applications/${id}?version=${d.version}${compare ? `&compare=${compare}` : ""}`}
                        className={`text-sm font-semibold hover:underline ${isSelected ? "text-brand" : "text-ink"}`}
                      >
                        第 {d.version} 版
                      </Link>
                      <span className="text-xs text-slate ml-2">
                        {new Date(d.created_at).toLocaleString("zh-TW")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-slate">
                        {wc} 字
                        {delta !== null && (
                          <span className={delta >= 0 ? "text-good ml-1" : "text-danger ml-1"}>
                            （{delta >= 0 ? "+" : ""}
                            {delta}）
                          </span>
                        )}
                      </div>
                      <Link
                        href={
                          isCompared
                            ? `/agency/applications/${id}?version=${selectedDraft?.version || ""}`
                            : `/agency/applications/${id}?version=${selectedDraft?.version || ""}&compare=${d.version}`
                        }
                        className={`text-xs underline ${isCompared ? "text-brand" : "text-slate"}`}
                      >
                        {isCompared ? "取消比較" : "比較"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        </>
      )}
    </div>
  );
}
