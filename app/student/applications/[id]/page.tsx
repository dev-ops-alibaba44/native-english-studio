import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StageThread } from "@/components/StageThread";
import { STAGE_LABELS, type Stage } from "@/lib/stages";
import { DraftComposer } from "@/components/editor/DraftComposer";
import { AnnotatedDraft } from "@/components/editor/AnnotatedDraft";
import { LiveRefresh } from "@/components/realtime/LiveRefresh";
import { addDraft } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  draft_failed: "無法儲存草稿，請稍後再試。",
};

export default async function ApplicationDetailPage({
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
    .select("id, prompt_text, word_limit, deadline, stage, schools(name)")
    .eq("id", id)
    .single();

  const { data: drafts } = await supabase
    .from("drafts")
    .select("id, content, content_json, version, created_at")
    .eq("application_id", id)
    .order("version", { ascending: false });

  const latestDraft = drafts?.[0];

  const { data: comments } = latestDraft
    ? await supabase
        .from("comments")
        .select("id, body, anchor_text, range_from, range_to, kind, created_at, profiles(display_name)")
        .eq("draft_id", latestDraft.id)
        .order("created_at", { ascending: true })
    : { data: [] as any[] };

  if (!application) {
    return <p className="text-sm text-danger">找不到這個申請項目。</p>;
  }

  const app = application as any;
  const addDraftForThisApplication = addDraft.bind(null, id);
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
      {latestDraft && <LiveRefresh applicationId={id} draftId={latestDraft.id} />}
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

      {error && (
        <div className="rounded border border-danger/30 bg-danger-tint text-danger text-sm px-4 py-3 mb-6">
          {ERROR_MESSAGES[error] || "發生錯誤，請稍後再試。"}
        </div>
      )}

      <div className="mb-8">
        <StageThread stage={app.stage as Stage} />
        <p className="text-xs text-slate mt-2">
          目前階段：{STAGE_LABELS[app.stage as Stage]}
        </p>
      </div>

      <h3 className="font-display font-bold text-base mb-2">
        撰寫草稿{latestDraft ? `（將建立第 ${latestDraft.version + 1} 版）` : ""}
      </h3>
      <div className="mb-2">
        <DraftComposer
          key={latestDraft?.id || "new"}
          initialContent={(latestDraft?.content_json as any) || null}
          initialPlainText={latestDraft?.content || ""}
          action={addDraftForThisApplication}
        />
      </div>
      {latestDraft?.created_at && (
        <p className="text-xs text-slate mb-8">
          上次儲存：
          {new Date(latestDraft.created_at).toLocaleString("zh-TW", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

      <h3 className="font-display font-bold text-base mb-2">顧問回饋</h3>
      {!latestDraft ? (
        <p className="text-sm text-slate">上傳草稿後即可查看顧問回饋。</p>
      ) : (
        <AnnotatedDraft
          key={latestDraft.id}
          content={(latestDraft.content_json as any) || latestDraft.content || ""}
          comments={commentsForDisplay}
          canComment={false}
        />
      )}
    </div>
  );
}
