import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SuperAdminOverviewPage() {
  const supabase = await createClient();

  const [
    { count: agencyCount },
    { count: studentCount },
    { count: advisorCount },
    { count: openLeadCount },
  ] = await Promise.all([
    supabase.from("agencies").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "advisor"),
    supabase
      .from("agency_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
  ]);

  const stats = [
    { label: "機構數", value: agencyCount ?? 0, href: "/super-admin/agencies" },
    { label: "學生數", value: studentCount ?? 0, href: "/super-admin/agencies" },
    { label: "顧問數", value: advisorCount ?? 0, href: "/super-admin/agencies" },
    { label: "待處理洽詢", value: openLeadCount ?? 0, href: "/super-admin/leads" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">總覽</h1>
      <p className="mt-1 text-sm text-slate">平台整體現況一覽。</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded border border-line bg-surface p-5 shadow-card hover:border-brand"
          >
            <div className="text-2xl font-bold text-ink">{s.value}</div>
            <div className="mt-1 text-xs text-slate">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded border border-line bg-brand-tint p-5 text-sm text-ink">
        <p className="font-semibold">尚未串接 Stripe</p>
        <p className="mt-1 text-slate">
          機構與個人的實際帳單、繳費紀錄，需要等 Stripe 串接完成後才會顯示在這裡。目前「機構列表」頁面中的費用資訊，是您手動輸入的參考紀錄。
        </p>
      </div>
    </div>
  );
}
