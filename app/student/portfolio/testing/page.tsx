import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TestingSection } from "@/components/portfolio/TestingSection";

export default async function StudentTestingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <Link href="/student/portfolio" className="text-xs text-slate mb-3 inline-block">
        ← 回到學習檔案
      </Link>
      <TestingSection studentId={user!.id} />
    </div>
  );
}
