import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActivitySection } from "@/components/portfolio/ActivitySection";

export default async function AdvisorAwardsPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student: studentId } = await searchParams;

  if (!studentId) {
    return (
      <div>
        <Link href="/advisor/portfolio" className="text-xs text-slate mb-3 inline-block">
          ← 回到學習檔案
        </Link>
        <p className="text-sm text-slate">請先從學習檔案頁面選擇一位學生。</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", studentId)
    .single();

  return (
    <div>
      <Link href="/advisor/portfolio" className="text-xs text-slate mb-3 inline-block">
        ← 回到學習檔案
      </Link>
      <ActivitySection studentId={studentId} category="award" studentName={student?.display_name} />
    </div>
  );
}
