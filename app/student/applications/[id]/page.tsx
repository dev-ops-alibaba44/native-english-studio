import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StageThread } from "@/components/StageThread";
import { STAGE_LABELS, type Stage } from "@/lib/stages";
import { LiveDocument } from "@/components/editor/LiveDocument";
import { saveSnapshot } from "@/app/actions/documents";
import { generateEssayFeedback } from "@/app/actions/ai-feedback";

// Save errors now surface inline in LiveDocument itself (returned directly
// from the action, not via a redirect+?error= query param) — this page no
// longer has any ?error= producer, so there's nothing left to render here.

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ snapshot?: string }>;
}) {
  const { id } = await params;
  const { snapshot } = await searchParams;
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, prompt_text, word_limit, deadline, stage, schools(name)")
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
  const returnPath = `/student/applications/${id}`;
  const saveSnapshotForThisApplication = saveSnapshot.bind(null, id, returnPath);
  const requestAIFeedbackForThisApplication = generateEssayFeedback.bind(null, id, roomId);

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

      <div className="rounded border border-brand/20 bg-brand-tint text-xs text-ink px-4 py-2 mb-4">
        這是即時共同編輯文件 — 你、顧問、以及機構管理者都可以同時在這裡撰寫與留言。
      </div>

      <LiveDocument
        key={roomId}
        roomId={roomId}
        onSaveSnapshot={saveSnapshotForThisApplication}
        onRequestAIFeedback={requestAIFeedbackForThisApplication}
        initialSnapshots={snapshots || []}
        basePath={returnPath}
        activeSnapshotId={snapshot || null}
      />
    </div>
  );
}
