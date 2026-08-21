import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<string, string> = { basic: "基本方案", advanced: "進階方案" };
const STATUS_LABEL: Record<string, string> = {
  inactive: "尚未開通",
  trialing: "試用中",
  active: "使用中",
  past_due: "付款逾期",
  canceled: "已取消",
};

export default async function ParentHomePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { success } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: parentAccount } = await supabase
    .from("parent_accounts")
    .select("plan_status")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: children } = await supabase
    .from("profiles")
    .select("id, display_name, chinese_name, seat_tier, birthdate")
    .eq("parent_id", user!.id)
    .order("display_name");

  const childCount = children?.length || 0;
  const canAddMore = childCount < 3 && ["trialing", "active"].includes(parentAccount?.plan_status || "");

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="font-display text-2xl font-bold text-ink">子女總覽</h1>
        {canAddMore && (
          <Link
            href="/parent/children/new"
            className="shrink-0 rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white"
          >
            + 新增子女
          </Link>
        )}
      </div>
      <p className="text-sm text-slate mb-6">
        最多可以新增 3 位子女，目前已新增 {childCount} 位。
        {parentAccount?.plan_status === "trialing" && (
          <span className="text-warn"> 帳號目前為 7 天試用期。</span>
        )}
      </p>

      {success === "child_added" && (
        <div className="rounded border border-good/30 bg-good-tint text-good text-sm px-4 py-3 mb-6">
          子女帳號已建立，邀請信已寄出。
        </div>
      )}

      {(!parentAccount || !["trialing", "active"].includes(parentAccount.plan_status)) && (
        <div className="rounded border border-danger/30 bg-danger-tint text-danger text-sm px-4 py-3 mb-6">
          此帳號的訂閱目前未生效，請至
          <Link href="/parent/billing" className="underline mx-1">
            帳單與訂閱
          </Link>
          完成付款設定。
        </div>
      )}

      {childCount === 0 ? (
        <p className="text-sm text-slate">尚未新增任何子女。</p>
      ) : (
        <div className="rounded border border-line bg-surface shadow-card divide-y divide-line">
          {(children || []).map((child: any) => (
            <div key={child.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">{child.display_name}</div>
                <div className="text-xs text-slate">
                  {child.chinese_name} · {TIER_LABEL[child.seat_tier] || child.seat_tier}
                  {child.birthdate && <> · {child.birthdate}</>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
