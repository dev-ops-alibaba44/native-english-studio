import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StageThread } from "@/components/StageThread";
import { type Stage } from "@/lib/stages";
import { createApplication } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  missing_school_name: "請輸入學校名稱。",
  no_agency: "此帳號尚未加入任何機構，請聯絡您的顧問協助設定。",
  school_failed: "無法建立學校資料，請稍後再試。",
  duplicate_school: "您已經新增過這間學校的申請了。",
  application_failed: "無法建立申請項目，請稍後再試。",
};

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; detail?: string; success?: string }>;
}) {
  const { error, detail, success } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: applications } = await supabase
    .from("applications")
    .select("id, prompt_text, word_limit, deadline, stage, schools(name)")
    .eq("student_id", user!.id)
    .order("deadline", { ascending: true, nullsFirst: false });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">我的申請</h1>
      <p className="text-sm text-slate mb-6">每個學校一張卡片，一眼看出進度到哪裡。</p>

      {error && (
        <div className="rounded border border-danger/30 bg-danger-tint text-danger text-sm px-4 py-3 mb-6">
          {ERROR_MESSAGES[error] || "發生錯誤，請稍後再試。"}
          {detail && <span className="block text-xs mt-1 opacity-80">詳細資訊：{detail}</span>}
        </div>
      )}
      {success && (
        <div className="rounded border border-good/30 bg-good-tint text-good text-sm px-4 py-3 mb-6">
          新增成功！
        </div>
      )}

      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {applications?.map((app: any) => (
          <Link
            key={app.id}
            href={`/student/applications/${app.id}`}
            className="rounded border border-line bg-surface shadow-card p-4 flex flex-col gap-3 hover:border-brand"
          >
            <div>
              <div className="font-display font-bold text-base">{app.schools?.name}</div>
              {app.word_limit && (
                <div className="text-xs text-slate mt-0.5">{app.word_limit} 字上限</div>
              )}
            </div>
            <StageThread stage={app.stage as Stage} size="sm" />
            <div className="text-xs text-slate">
              {app.deadline ? `截止日 ${app.deadline}` : "尚未設定截止日"}
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded border border-line bg-surface shadow-card p-5 max-w-md">
        <h3 className="font-display font-bold text-base mb-4">新增申請</h3>
        <form action={createApplication} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-slate mb-1">學校名稱</label>
            <input
              name="school_name"
              required
              className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              placeholder="例如：Duke University"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate mb-1">文書題目（選填）</label>
            <textarea
              name="prompt_text"
              rows={2}
              className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              placeholder="例如：What lights you up?"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate mb-1">字數上限（選填）</label>
              <input
                name="word_limit"
                type="number"
                className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                placeholder="650"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate mb-1">截止日（選填）</label>
              <input
                name="deadline"
                type="date"
                className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-1 rounded bg-ink py-2.5 text-sm font-semibold text-white"
          >
            新增
          </button>
        </form>
      </div>
    </div>
  );
}
