import { createClient } from "@/lib/supabase/server";
import { AiUsageOverview } from "@/components/AiUsageOverview";
import { getAiUsageItems } from "@/lib/ai-usage-items";

export default async function StudentAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .single();

  const usageItems = await getAiUsageItems(user!.id);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">帳號設定</h1>
      <p className="text-sm text-slate mb-6">{profile?.display_name}</p>

      <h2 className="font-display font-bold text-base mb-3">AI 使用量</h2>
      <div className="max-w-md">
        <AiUsageOverview items={usageItems} />
      </div>
    </div>
  );
}
