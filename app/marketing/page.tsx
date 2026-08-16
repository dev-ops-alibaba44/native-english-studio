import { LeadsBoard } from "@/components/super-admin/LeadsBoard";

export default function MarketingPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">洽詢與名單</h1>
      <p className="mt-1 text-sm text-slate">
        機構洽詢、學生／家長候補名單，以及聊天機器人留下的 email。更新右側狀態即可標記進度。
      </p>
      <div className="mt-8">
        <LeadsBoard />
      </div>
    </div>
  );
}
