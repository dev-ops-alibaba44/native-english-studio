import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { upgradeSeat } from "@/app/actions/seats";

export default async function UpgradeSeatConfirmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: seatId } = await params;
  const supabase = await createClient();

  const { data: seat } = await supabase
    .from("seats")
    .select("id, seat_type, assigned_student_id")
    .eq("id", seatId)
    .maybeSingle();

  if (!seat) {
    return <p className="text-sm text-danger">找不到這個席次。</p>;
  }

  let studentName: string | null = null;
  if (seat.assigned_student_id) {
    const { data: student } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", seat.assigned_student_id)
      .maybeSingle();
    studentName = student?.display_name ?? null;
  }

  return (
    <div className="max-w-lg">
      <Link href="/agency/billing" className="text-xs text-slate mb-3 inline-block">
        ← 取消，回到帳單與繳費
      </Link>

      <div className="rounded border border-warn/30 bg-warn-tint p-5">
        <h1 className="font-display text-xl font-bold text-ink mb-3">
          確定要將{studentName ? `「${studentName}」的` : "這個"}席次升級為進階席次嗎？
        </h1>
        <ul className="list-disc list-inside text-sm text-ink space-y-2 mb-4">
          <li>
            <b>席次只能升級，永遠無法降級。</b>
            一旦從標準席次升級為進階席次，將無法再改回標準席次——沒有例外，即使日後想要降低費用也一樣。
          </li>
          <li>升級會依剩餘訂閱期間比例計費，並立即從您的付款方式扣款。</li>
        </ul>
        <form action={upgradeSeat.bind(null, seatId)} className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            我了解，確認升級
          </button>
          <Link href="/agency/billing" className="text-sm text-slate underline">
            取消
          </Link>
        </form>
      </div>
    </div>
  );
}
