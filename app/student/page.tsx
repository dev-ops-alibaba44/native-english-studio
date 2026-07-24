import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABELS, type Stage } from "@/lib/stages";

export default async function StudentTodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .single();

  const { data: applications } = await supabase
    .from("applications")
    .select("id, deadline, stage, schools(name)")
    .eq("student_id", user!.id)
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(3);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">
        午安，{profile?.display_name || "同學"} 👋
      </h1>
      <p className="text-sm text-slate mb-6">今天不用做完全部的事，先看這幾件就好。</p>

      <div className="rounded border border-line bg-surface shadow-card mb-6">
        {!applications || applications.length === 0 ? (
          <p className="p-5 text-sm text-slate">
            目前還沒有申請項目。前往「我的申請」新增你的第一個學校吧。
          </p>
        ) : (
          applications.map((app: any) => (
            <Link
              key={app.id}
              href={`/student/applications/${app.id}`}
              className="flex items-center justify-between px-5 py-4 border-b border-line last:border-none hover:bg-paper"
            >
              <div>
                <div className="font-semibold text-sm">{app.schools?.name}</div>
                <div className="text-xs text-slate mt-0.5">
                  目前階段：{STAGE_LABELS[app.stage as Stage]}
                  {app.deadline ? ` · 截止日 ${app.deadline}` : ""}
                </div>
              </div>
              <span className="text-xs font-semibold text-brand">查看 →</span>
            </Link>
          ))
        )}
      </div>

      <div className="rounded-xl border border-brand/10 bg-brand-tint p-6" style={{ borderLeft: "3px solid #172983" }}>
        <h3 className="font-display text-base font-bold text-brand mb-2">今天想寫些什麼？</h3>
        <p className="text-sm text-slate mb-4 leading-relaxed">
          花 10 分鐘做個引導式發想，不用一次就寫得完美。
        </p>
        <Link
          href="/student/prompts"
          className="inline-block rounded bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          開始發想 →
        </Link>
      </div>
    </div>
  );
}
