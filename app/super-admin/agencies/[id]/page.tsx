import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateAgencyBilling } from "@/app/actions/super-admin";

export default async function SuperAdminAgencyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: agency } = await supabase
    .from("agencies")
    .select("id, name, created_at, plan_status, annual_fee_usd, plan_notes")
    .eq("id", id)
    .single();

  const { data: students } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("agency_id", id)
    .eq("role", "student")
    .order("display_name");

  if (!agency) {
    return <p className="text-sm text-slate">找不到這個機構。</p>;
  }

  async function saveBilling(formData: FormData) {
    "use server";
    await updateAgencyBilling(id, formData);
  }

  return (
    <div>
      <Link href="/super-admin/agencies" className="text-xs text-brand hover:underline">
        ← 回到機構列表
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink">{agency.name}</h1>
      <p className="mt-1 text-xs text-slate">
        加入時間：{new Date(agency.created_at).toLocaleDateString("zh-TW")}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-base font-bold text-ink">學生（{students?.length ?? 0}）</h2>
          <div className="mt-3 space-y-1.5">
            {(students ?? []).map((s) => (
              <Link
                key={s.id}
                href={`/super-admin/students/${s.id}`}
                className="block rounded border border-line bg-surface px-3 py-2 text-sm text-ink hover:border-brand"
              >
                {s.display_name || "（未命名）"}
              </Link>
            ))}
            {(students ?? []).length === 0 && (
              <p className="text-sm text-slate">這個機構目前沒有學生帳號。</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-display text-base font-bold text-ink">方案與費用（手動紀錄）</h2>
          <p className="mt-1 text-xs text-slate">
            尚未串接 Stripe，以下為您手動輸入的參考紀錄。
          </p>
          <form action={saveBilling} className="mt-3 space-y-3 rounded border border-line bg-surface p-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">方案狀態</label>
              <select
                name="plan_status"
                defaultValue={agency.plan_status}
                className="w-full rounded border border-line px-3 py-2 text-sm bg-surface"
              >
                <option value="trial">試用中</option>
                <option value="active">使用中</option>
                <option value="past_due">逾期未繳</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1">年費（USD）</label>
              <input
                type="number"
                name="annual_fee_usd"
                step="0.01"
                defaultValue={agency.annual_fee_usd ?? ""}
                className="w-full rounded border border-line px-3 py-2 text-sm"
                placeholder="例：2000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1">備註</label>
              <textarea
                name="plan_notes"
                rows={3}
                defaultValue={agency.plan_notes ?? ""}
                className="w-full rounded border border-line px-3 py-2 text-sm"
                placeholder="例：付款方式、續約日期等"
              />
            </div>
            <button
              type="submit"
              className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-brand"
            >
              儲存
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
