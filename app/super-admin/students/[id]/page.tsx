import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StageThread } from "@/components/StageThread";
import type { Stage } from "@/lib/stages";

export default async function SuperAdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("profiles")
    .select("id, display_name, agency_id, agencies(name)")
    .eq("id", id)
    .single();

  const { data: applications } = await supabase
    .from("applications")
    .select("id, prompt_text, stage, deadline, schools(name)")
    .eq("student_id", id)
    .order("deadline", { ascending: true, nullsFirst: false });

  if (!student) {
    return <p className="text-sm text-slate">找不到這個學生。</p>;
  }

  return (
    <div>
      <p className="text-xs text-slate">
        {(student as unknown as { agencies?: { name?: string } }).agencies?.name}
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">
        {student.display_name || "（未命名）"}
      </h1>
      <p className="mt-1 text-xs text-slate">
        唯讀檢視 — 您可以查看這位學生的申請進度與文書內容，但無法編輯。
      </p>

      <div className="mt-8 space-y-4">
        {(applications ?? []).map((app) => {
          const school = (app as unknown as { schools?: { name?: string } }).schools;
          return (
            <Link
              key={app.id}
              href={`/super-admin/applications/${app.id}`}
              className="block rounded border border-line bg-surface p-5 shadow-card hover:border-brand"
            >
              <div className="flex items-center justify-between">
                <div className="font-display text-base font-bold text-ink">
                  {school?.name ?? "未命名學校"}
                </div>
                {app.deadline && (
                  <div className="text-xs text-slate">截止日 {app.deadline}</div>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-slate">{app.prompt_text}</p>
              <div className="mt-4">
                <StageThread stage={app.stage as Stage} size="sm" />
              </div>
            </Link>
          );
        })}
        {(applications ?? []).length === 0 && (
          <p className="text-sm text-slate">這位學生目前沒有申請項目。</p>
        )}
      </div>
    </div>
  );
}
