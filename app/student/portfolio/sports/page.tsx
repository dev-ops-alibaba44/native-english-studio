import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActivitySection } from "@/components/portfolio/ActivitySection";

export default async function StudentSportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <Link href="/student/portfolio" className="text-xs text-slate mb-3 inline-block">
        ← 回到學習檔案
      </Link>
      <ActivitySection studentId={user!.id} category="sport" />
    </div>
  );
}
