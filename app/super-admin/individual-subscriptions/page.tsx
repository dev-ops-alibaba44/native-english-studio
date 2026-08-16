import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SuperAdminIndividualSubscriptionsPage() {
  const supabase = await createClient();

  const { count: waitlistCount } = await supabase
    .from("waitlist_signups")
    .select("id", { count: "exact", head: true });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">個人訂閱</h1>

      <div className="mt-6 rounded border border-warn/30 bg-warn-tint p-5 text-sm text-ink">
        <p className="font-semibold">這裡還沒有真正的資料</p>
        <p className="mt-1 text-slate">
          個人（不透過機構）訂閱功能，需要先完成兩件事：家長帳號驗證，以及 Stripe
          串接。這兩項目前都還沒開始做，所以這裡暫時沒有訂閱者、繳費紀錄，或用量統計可以顯示。
        </p>
      </div>

      <div className="mt-6 rounded border border-line bg-surface p-5 shadow-card">
        <p className="text-sm text-ink">
          目前最接近的資料，是首頁的「學生與家長候補名單」——
          <strong>{waitlistCount ?? 0}</strong> 人已經留下聯絡方式，等待個人方案開放。
        </p>
        <Link
          href="/super-admin/leads"
          className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
        >
          查看候補名單 →
        </Link>
      </div>
    </div>
  );
}
