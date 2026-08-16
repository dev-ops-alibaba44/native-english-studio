import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { archiveStudent } from "@/app/actions/seats";

export default async function ArchiveStudentConfirmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: studentId } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) {
    return <p className="text-sm text-danger">找不到這位學生。</p>;
  }

  return (
    <div className="max-w-lg">
      <Link href="/agency/students" className="text-xs text-slate mb-3 inline-block">
        ← 取消，回到學生總覽
      </Link>

      <div className="rounded border border-danger/30 bg-danger-tint p-5">
        <h1 className="font-display text-xl font-bold text-danger mb-3">
          確定要封存「{student.display_name}」嗎？
        </h1>
        <ul className="list-disc list-inside text-sm text-ink space-y-2 mb-4">
          <li>
            <b>這個動作無法復原。</b>封存後的學生帳號無法「解除封存」，也沒有任何方式恢復成使用中的狀態。
          </li>
          <li>
            <b>此學生所使用的席次不會釋出，也不會退款。</b>
            即使席次尚未到期（365 天），封存後這個席次就永久無法再分配給任何其他學生使用。
          </li>
          <li>如果貴機構之後需要服務其他學生，必須另外購買新的席次——沒有例外。</li>
          <li>學生的歷史資料（申請進度、文件、成績等）會被保留，僅轉為唯讀，不會被刪除。</li>
        </ul>
        <form action={archiveStudent.bind(null, studentId)} className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded bg-danger px-4 py-2 text-sm font-semibold text-white"
          >
            我了解，確認封存
          </button>
          <Link href="/agency/students" className="text-sm text-slate underline">
            取消
          </Link>
        </form>
      </div>
    </div>
  );
}
