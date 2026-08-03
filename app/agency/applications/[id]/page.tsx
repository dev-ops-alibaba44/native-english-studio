import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StageThread } from "@/components/StageThread";
import { STAGE_ORDER, STAGE_LABELS, type Stage } from "@/lib/stages";
import { LiveDocument } from "@/components/editor/LiveDocument";
import { SnapshotHistory } from "@/components/SnapshotHistory";
import { saveSnapshot } from "@/app/actions/documents";
import { generateEssayFeedback } from "@/app/actions/ai-feedback";
import { updateStage } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  stage_failed: "無法更新階段，請稍後再試。",
  snapshot_failed: "無法儲存快照，請稍後再試。",
};

export default async function AgencyApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; snapshot?: string }>;
}) {
  const { id } = await params;
  const { error, snapshot } = await searchParams;
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, prompt_text, word_limit, deadline, stage, schools(name), profiles(display_name)")
    .eq("id", id)
    .single();

  const roomId = `application:${id}`;

  const { data: snapshots } = await supabase
    .from("drafts")
    .select("id, content, version, created_at")
    .eq("application_id", id)
    .order("version", { ascending: false });

  if (!application) {
    return <p className="text-sm text-danger">找不到這個申請項目。</p>;
  }

  const app = application as any;
  const returnPath = `/agency/applications/${id}`;
  const saveSnapshotForThisApplication = saveSnapshot.bind(null, id, returnPath);
  const requestAIFeedbackForThisApplication = generateEssayFeedback.bind(null, id, roomId);
  const updateStageForThisApplication = updateStage.bind(null, id);

  return (
    <div>
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

      <div className="rounded border border-line bg-surface shadow-card p-4 mb-6 flex items-center gap-3">
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

      <div className="rounded border border-brand/20 bg-brand-tint text-xs text-ink px-4 py-2 mb-4">
        這是即時共同編輯文件 — 學生、顧問、以及你都可以同時在這裡撰寫與留言。
      </div>

      <LiveDocument
        key={roomId}
        roomId={roomId}
        onSaveSnapshot={saveSnapshotForThisApplication}
        onRequestAIFeedback={requestAIFeedbackForThisApplication}
        historySlot={
          snapshots ? (
            <SnapshotHistory
              snapshots={snapshots}
              basePath={returnPath}
              activeSnapshotId={snapshot || null}
            />
          ) : undefined
        }
      />
    </div>
  );
}
